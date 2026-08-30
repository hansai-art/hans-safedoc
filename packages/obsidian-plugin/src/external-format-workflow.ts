import { link, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { detectAll, type DetectedCandidate } from '@privacy-bridge/core';
import {
  csvAdapter,
  detectCsvDialect,
  parseCsv,
  rewriteCsv,
  type CsvDialect,
} from '../../document-formats/src/csv/adapter.js';
import { openReadOnlySource } from '../../document-formats/src/read-only-source.js';
import { txtAdapter } from '../../document-formats/src/txt/adapter.js';
import { docxAdapter } from '../../document-formats/src/docx/adapter.js';
import { xlsxAdapter } from '../../document-formats/src/xlsx/adapter.js';
import type {
  FormatKind,
  FormatLocatorV11,
  RewriteOperation,
} from '../../document-formats/src/contracts.js';
import type { ReadOnlySource } from '../../document-formats/src/read-only-source.js';
import type { PreparedReviewedDocument } from './workflow.js';
import { SUPPORTED_EXTERNAL_EXTENSIONS } from './novice-support.js';

export type ExternalCandidateDetector = (
  source: string,
) => Promise<readonly DetectedCandidate[]> | readonly DetectedCandidate[];

interface TextUnit {
  readonly text: string;
  readonly location?: string;
  readonly locator:
    | { kind: 'txt'; start: number; end: number }
    | { kind: 'csv'; field: ReturnType<typeof parseCsv>['rows'][number][number] }
    | {
        kind: 'docx';
        locator: Extract<FormatLocatorV11, { kind: 'docx-text' }>;
      }
    | {
        kind: 'xlsx';
        locator: Extract<
          FormatLocatorV11,
          { kind: 'xlsx-cell-text' | 'xlsx-raw-value' | 'xlsx-display-value' }
        >;
      };
}

type ReleaseFormatKind = FormatKind;
type DocxRewriteLocator = Extract<FormatLocatorV11, { kind: 'docx-text' }>;
type XlsxRewriteLocator = Extract<
  FormatLocatorV11,
  { kind: 'xlsx-cell-text' | 'xlsx-raw-value' | 'xlsx-display-value' }
>;

export interface ExternalMandatoryReviewRecord {
  readonly id: string;
  readonly kind: 'metadata' | 'hyperlink' | 'name' | 'theme' | 'media';
  readonly label: string;
  readonly location: string;
  readonly value: string;
  readonly warning: string;
}

export interface ExternalReviewDocument {
  readonly kind: ReleaseFormatKind;
  readonly path: string;
  readonly source: ReadOnlySource;
  readonly csvDialect: CsvDialect | undefined;
  readonly sourceContent: string;
  readonly candidates: readonly DetectedCandidate[];
  readonly units: readonly TextUnit[];
  readonly mandatoryReviewRecords: readonly ExternalMandatoryReviewRecord[];
  readonly candidateLocations: ReadonlyMap<string, string>;
  readonly candidateUnits: ReadonlyMap<
    string,
    { unit: number; localStart: number; localEnd: number }
  >;
}

export type ExternalOpenResult =
  | { readonly status: 'READY'; readonly document: ExternalReviewDocument }
  | { readonly status: 'PDF_AGENT_ONLY'; readonly message: string };

const supported = new Set<ReleaseFormatKind>(SUPPORTED_EXTERNAL_EXTENSIONS);

function mandatoryRecord(
  kind: ExternalMandatoryReviewRecord['kind'],
  label: string,
  location: string,
  value: string,
  warning = '此內容會保留在安全副本，請確認它不需要移除。',
): ExternalMandatoryReviewRecord {
  const id = createHash('sha256')
    .update(`${kind}\u0000${location}\u0000${value}`, 'utf8')
    .digest('hex');
  return { id, kind, label, location, value, warning };
}

export function explainExternalFileError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'Inconsistent CSV column count')
    return '這份 CSV 每一列的欄位數不同。請回到試算表補齊缺少的欄位，再重新匯出 CSV。';
  if (message === 'CSV active content blocked')
    return '這份 CSV 含有可能被試算表執行的公式。請先在原始試算表轉成純文字，再重新匯出。';
  if (message === 'Malformed CSV quote')
    return '這份 CSV 的引號沒有成對，欄位可能已經錯位。請回到原始試算表重新匯出。';
  if (message === 'CSV delimiter is ambiguous')
    return 'Hans SafeDoc 無法安全判斷這份 CSV 如何分欄，請選擇逗號、Tab 或分號。';
  if (message.startsWith('HSD-ENC-101'))
    return '這份檔案使用 UTF-16 編碼。請在原本的程式中另存成 UTF-8，再重新選擇。';
  if (message.startsWith('HSD-ENC-100'))
    return '這份檔案不是 UTF-8 編碼。請在原本的程式中另存成 UTF-8，再重新選擇。';
  if (message.startsWith('HSD-ENC-102'))
    return '這份檔案含有純文字不應出現的資料。請確認選到的是 MD、TXT 或 CSV，並重新匯出。';
  if (message.startsWith('HSD-ENC-103'))
    return '這份檔案中間含有異常的編碼標記。請回到原本的程式重新另存成 UTF-8。';
  if (message.startsWith('HSD-ENC-104'))
    return '這份檔案含有不安全的隱藏控制字元。請回到原本的程式清除異常字元後再試。';
  if (message.startsWith('OOXML blocked:')) {
    if (/formula|calc-chain|shared-formula|array-formula|data-table/iu.test(message))
      return '這份 Excel 含有公式或計算結構。為避免公式、快取值或外部參照洩漏資料，Hans SafeDoc 已停止處理；請先在 Excel 另存一份只含純文字值的副本。';
    if (/comment|tracked|revision|move-from|move-to|inserted|deleted/iu.test(message))
      return '這份 Office 文件含有註解或修訂紀錄。這些隱藏內容可能保留原文，Hans SafeDoc 已停止處理；請先在 Word 或 Excel 接受／拒絕修訂並移除註解。';
    if (/macro|vba|ole|activex|embedded|external|connection|pivot|query/iu.test(message))
      return '這份 Office 文件含有巨集、嵌入物件、外部資料或進階功能。Hans SafeDoc 不會嘗試繞過，請先另存成不含這些功能的 DOCX／XLSX 副本。';
    if (/zip-|invalid-|integrity|compression|resource-limit|entry-limit/iu.test(message))
      return '這份 Office 文件已損壞、加密、過大或壓縮結構不安全。Hans SafeDoc 已停止且沒有建立輸出；請回到 Word 或 Excel 重新另存一份。';
    return '這份 Office 文件含有 Hans SafeDoc 尚未安全驗證的結構。為避免漏掉隱藏資料，已停止處理且沒有建立輸出；請用 Word 或 Excel 另存成較單純的 DOCX／XLSX 後再試。';
  }
  return '處理這份檔案時發生未預期錯誤。來源未修改，也沒有建立輸出；請重新開啟 Hans SafeDoc 後再試，若仍失敗請改用純文字副本。';
}

function extensionOf(path: string): string {
  return extname(path).slice(1).toLowerCase();
}

async function extractUnits(
  kind: ReleaseFormatKind,
  bytes: Buffer,
  csvDialect?: CsvDialect,
): Promise<{
  units: readonly TextUnit[];
  mandatoryReviewRecords: readonly ExternalMandatoryReviewRecord[];
}> {
  if (kind === 'md' || kind === 'txt') {
    const text = txtAdapter.extract(bytes).text;
    return {
      units: [{ text, locator: { kind: 'txt', start: 0, end: text.length } }],
      mandatoryReviewRecords: [],
    };
  }
  if (kind === 'csv') {
    if (!csvDialect) throw new Error('CSV 分隔符尚未由使用者確認');
    const extracted = parseCsv(bytes, csvDialect);
    return {
      units: extracted.rows
        .flat()
        .map((field) => ({ text: field.value, locator: { kind: 'csv' as const, field } })),
      mandatoryReviewRecords: [],
    };
  }
  if (kind === 'docx') {
    const extracted = docxAdapter.extract(bytes);
    return {
      units: extracted.surfaces
        .filter((surface) => surface.text.length > 0)
        .map((surface) => ({
          text: surface.text,
          location: surface.part,
          locator: { kind: 'docx' as const, locator: surface.locator },
        })),
      mandatoryReviewRecords: [
        ...extracted.reviewItems.map((item) =>
          mandatoryRecord(
            item.kind === 'hyperlink' ? 'hyperlink' : 'metadata',
            item.kind === 'hyperlink' ? '超連結目標' : '文件屬性或註解作者',
            item.part,
            item.value,
          ),
        ),
        ...extracted.media.map((media) =>
          mandatoryRecord(
            'media',
            '未掃描圖片',
            media.location.join('、') || media.part,
            `${media.mime} · ${media.dimensions ? `${media.dimensions.width}×${media.dimensions.height}` : '尺寸未知'} · SHA-256 ${media.sha256}`,
            'Hans SafeDoc 不會讀取圖片內的文字；確認後圖片會原樣保留。',
          ),
        ),
        ...extracted.manualReview
          .filter((item) => item === 'word/theme/theme1.xml')
          .map((item) =>
            mandatoryRecord('theme', '文件主題', item, '主題名稱與樣式', '主題會原樣保留。'),
          ),
      ],
    };
  }
  if (kind === 'xlsx') {
    const extracted = xlsxAdapter.extract(bytes);
    return {
      units: extracted.cells
        .filter((cell) => cell.candidatePolicy !== 'ordinary-number' && cell.value.length > 0)
        .map((cell) => ({
          text: cell.candidatePolicy === 'formatted-identifier' ? cell.displayValue : cell.value,
          location: `工作表「${cell.sheetName}」${
            cell.sheetState === 'visible' ? '' : `（${cell.sheetState}）`
          } · 儲存格 ${cell.cell}`,
          locator: { kind: 'xlsx' as const, locator: cell.locator },
        })),
      mandatoryReviewRecords: [
        ...extracted.reviewItems.map((item) =>
          mandatoryRecord(
            item.kind === 'hyperlink'
              ? 'hyperlink'
              : item.kind === 'metadata'
                ? 'metadata'
                : 'name',
            item.kind === 'sheet-name'
              ? '工作表名稱'
              : item.kind === 'defined-name'
                ? '定義名稱'
                : item.kind === 'table-name'
                  ? '表格名稱'
                  : item.kind === 'hyperlink'
                    ? '超連結目標'
                    : '文件屬性',
            item.part,
            item.value,
          ),
        ),
        ...extracted.manualReview
          .filter((item) => item === 'xl/theme/theme1.xml')
          .map((item) =>
            mandatoryRecord('theme', '活頁簿主題', item, '主題名稱與樣式', '主題會原樣保留。'),
          ),
      ],
    };
  }
  throw new Error(`不支援或已阻擋的格式：.${kind}`);
}

export async function openExternalReviewDocument(
  path: string,
  csvDialect?: CsvDialect,
  detector: ExternalCandidateDetector = (source) => {
    const result = detectAll(source);
    if (!result.ok) throw new Error(`掃描失敗：${result.error.code}`);
    return result.value;
  },
): Promise<ExternalOpenResult> {
  const extension = extensionOf(path);
  if (extension === 'pdf') {
    return {
      status: 'PDF_AGENT_ONLY',
      message: 'PDF 不會直接送進 Hans SafeDoc；請 AI Agent 在本機先轉成 MD，再選擇該 MD。',
    };
  }
  if (!supported.has(extension as ReleaseFormatKind))
    throw new Error(`不支援或已阻擋的格式：.${extension || 'unknown'}`);
  const kind = extension as ReleaseFormatKind;
  const source = await openReadOnlySource(path);
  const bytes = await source.read();
  let resolvedCsvDialect = csvDialect;
  if (kind === 'csv' && !resolvedCsvDialect) {
    const detected = detectCsvDialect(bytes);
    if (detected.status === 'AMBIGUOUS') throw new Error('CSV delimiter is ambiguous');
    resolvedCsvDialect = detected.dialect;
  }
  const extracted = await extractUnits(kind, bytes, resolvedCsvDialect);
  const units = extracted.units;
  await source.recheck('after-extraction');
  const candidates: DetectedCandidate[] = [];
  const candidateUnits = new Map<string, { unit: number; localStart: number; localEnd: number }>();
  const candidateLocations = new Map<string, string>();
  let offset = 0;
  const sourceParts: string[] = [];
  for (const [unitIndex, unit] of units.entries()) {
    const detected = await detector(unit.text);
    sourceParts.push(unit.text);
    for (const candidate of detected) {
      const candidateId = `${unitIndex}:${candidate.candidateId}`;
      candidates.push({
        ...candidate,
        candidateId,
        start: offset + candidate.start,
        end: offset + candidate.end,
      });
      candidateUnits.set(candidateId, {
        unit: unitIndex,
        localStart: candidate.start,
        localEnd: candidate.end,
      });
      if (unit.location) candidateLocations.set(candidateId, unit.location);
    }
    offset += unit.text.length + 1;
  }
  return {
    status: 'READY',
    document: {
      kind,
      path,
      source,
      csvDialect: resolvedCsvDialect,
      sourceContent: sourceParts.join('\n'),
      candidates,
      units,
      mandatoryReviewRecords: extracted.mandatoryReviewRecords,
      candidateLocations,
      candidateUnits,
    },
  };
}

async function rewriteArtifact(
  document: ExternalReviewDocument,
  bytes: Buffer,
  prepared: PreparedReviewedDocument,
): Promise<Buffer> {
  const replacements = new Map(
    prepared.previewChanges
      .filter((change) => change.decision === 'ACCEPTED')
      .map((change) => [change.candidateId, change.after]),
  );
  if (document.kind === 'md' || document.kind === 'txt') {
    const operations = [...replacements].map(([candidateId, replacement]) => {
      const mapped = document.candidateUnits.get(candidateId)!;
      return { start: mapped.localStart, end: mapped.localEnd, replacement };
    });
    return txtAdapter.rewrite(bytes, operations);
  }
  if (document.kind === 'csv') {
    const byUnit = new Map<number, { start: number; end: number; replacement: string }[]>();
    for (const [candidateId, replacement] of replacements) {
      const mapped = document.candidateUnits.get(candidateId)!;
      const values = byUnit.get(mapped.unit) ?? [];
      values.push({ start: mapped.localStart, end: mapped.localEnd, replacement });
      byUnit.set(mapped.unit, values);
    }
    if (!document.csvDialect) throw new Error('CSV 分隔符狀態遺失');
    return rewriteCsv(
      bytes,
      [...byUnit].map(([unitIndex, changes]) => {
        const unit = document.units[unitIndex]!;
        if (unit.locator.kind !== 'csv') throw new Error('CSV locator mismatch');
        let value = unit.text;
        for (const change of changes.sort((left, right) => right.start - left.start))
          value = `${value.slice(0, change.start)}${change.replacement}${value.slice(change.end)}`;
        return { locator: unit.locator.field.locator, replacement: value };
      }),
      document.csvDialect.delimiter,
    );
  }
  if (document.kind === 'docx') {
    const operations: RewriteOperation<DocxRewriteLocator>[] = [];
    for (const [candidateId, replacement] of replacements) {
      const mapped = document.candidateUnits.get(candidateId)!;
      const unit = document.units[mapped.unit]!;
      if (unit.locator.kind !== 'docx') throw new Error('DOCX locator mismatch');
      operations.push({
        locator: {
          ...unit.locator.locator,
          logicalStartUtf16: mapped.localStart,
          logicalEndUtf16: mapped.localEnd,
        },
        replacement,
      });
    }
    return docxAdapter.rewrite(bytes, operations);
  }
  if (document.kind === 'xlsx') {
    const byUnit = new Map<number, { start: number; end: number; replacement: string }[]>();
    for (const [candidateId, replacement] of replacements) {
      const mapped = document.candidateUnits.get(candidateId)!;
      const changes = byUnit.get(mapped.unit) ?? [];
      changes.push({ start: mapped.localStart, end: mapped.localEnd, replacement });
      byUnit.set(mapped.unit, changes);
    }
    const operations: RewriteOperation<XlsxRewriteLocator>[] = [...byUnit].map(
      ([unitIndex, changes]) => {
        const unit = document.units[unitIndex]!;
        if (unit.locator.kind !== 'xlsx') throw new Error('XLSX locator mismatch');
        let replacement = unit.text;
        for (const change of changes.sort((left, right) => right.start - left.start))
          replacement = `${replacement.slice(0, change.start)}${change.replacement}${replacement.slice(change.end)}`;
        return { locator: unit.locator.locator, replacement };
      },
    );
    return xlsxAdapter.rewrite(bytes, operations);
  }
  throw new Error('不支援或已阻擋的格式');
}

async function verifyArtifact(
  document: ExternalReviewDocument,
  artifact: Buffer,
  needles: readonly string[],
): Promise<void> {
  const unacknowledgedResiduals = (residuals: readonly string[]): readonly string[] =>
    residuals.filter(
      (needle) => !document.mandatoryReviewRecords.some((record) => record.value.includes(needle)),
    );
  if (document.kind === 'md' || document.kind === 'txt') {
    txtAdapter.reopen(artifact);
    if (txtAdapter.residual(artifact, needles).length > 0)
      throw new Error('安全副本仍含已接受的原始資料');
    return;
  }
  if (document.kind === 'csv') {
    if (!document.csvDialect) throw new Error('CSV 分隔符狀態遺失');
    parseCsv(artifact, document.csvDialect);
    if (csvAdapter.residual(artifact, needles).length > 0)
      throw new Error('安全副本仍含已接受的原始資料');
    return;
  }
  if (document.kind === 'docx') {
    docxAdapter.reopen(artifact);
    if (unacknowledgedResiduals(docxAdapter.residual(artifact, needles)).length > 0)
      throw new Error('安全副本仍含已接受的原始資料');
    return;
  }
  if (document.kind === 'xlsx') {
    xlsxAdapter.reopen(artifact);
    if (unacknowledgedResiduals(xlsxAdapter.residual(artifact, needles)).length > 0)
      throw new Error('安全副本仍含已接受的原始資料');
    return;
  }
  throw new Error('不支援或已阻擋的格式');
}

function assertPreparedReviewMatchesDocument(
  document: ExternalReviewDocument,
  prepared: PreparedReviewedDocument,
): void {
  const documentSha256 = createHash('sha256').update(document.sourceContent, 'utf8').digest('hex');
  const candidatesMatch =
    document.candidates.length === prepared.candidates.length &&
    document.candidates.every((candidate, index) => {
      const preparedCandidate = prepared.candidates[index];
      return (
        preparedCandidate?.candidateId === candidate.candidateId &&
        preparedCandidate.sourceTextHash === candidate.sourceTextHash &&
        preparedCandidate.start === candidate.start &&
        preparedCandidate.end === candidate.end
      );
    });
  if (prepared.sourceSha256 !== documentSha256 || !candidatesMatch)
    throw new Error('審核預覽不屬於目前來源，請重新選擇檔案並完成逐項審核。');
}

export async function publishExternalReviewedDocument(input: {
  readonly document: ExternalReviewDocument;
  readonly prepared: PreparedReviewedDocument;
  readonly mandatoryReviewIds?: readonly string[];
  readonly outputParent: string;
}): Promise<string> {
  assertPreparedReviewMatchesDocument(input.document, input.prepared);
  const expectedMandatory = [
    ...new Set(input.document.mandatoryReviewRecords.map((record) => record.id)),
  ].sort();
  const acknowledgedMandatory = [...new Set(input.mandatoryReviewIds ?? [])].sort();
  if (
    expectedMandatory.length !== acknowledgedMandatory.length ||
    expectedMandatory.some((id, index) => acknowledgedMandatory[index] !== id)
  )
    throw new Error('仍有強制人工確認項目尚未逐項確認。');
  await input.document.source.recheck('before-rewrite');
  const bytes = await input.document.source.read();
  const artifact = await rewriteArtifact(input.document, bytes, input.prepared);
  const needles = input.prepared.previewChanges
    .filter((change) => change.decision === 'ACCEPTED')
    .map((change) => change.before);
  await verifyArtifact(input.document, artifact, needles);
  await input.document.source.recheck('before-staging-write');
  await mkdir(input.outputParent, { recursive: true, mode: 0o700 });
  const suffix = randomBytes(5).toString('hex');
  const extension = extname(basename(input.document.path));
  const outputName = `hans-safedoc-${suffix}${extension}`;
  const staging = join(input.outputParent, `.${outputName}.${suffix}.tmp`);
  const output = join(input.outputParent, outputName);
  let published = false;
  try {
    await writeFile(staging, artifact, { mode: 0o600 });
    await verifyArtifact(input.document, await readFile(staging), needles);
    await input.document.source.recheck('before-publish');
    await link(staging, output);
    published = true;
    await input.document.source.recheck('after-publish');
    await rm(staging, { force: true });
    return output;
  } catch (error) {
    await rm(staging, { force: true });
    if (published) await rm(output, { force: true });
    throw error;
  }
}
