import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FormatLocatorV11, RewriteOperation } from '../contracts.js';
import { extractAttributeSurfaces } from '../ooxml/attribute-surfaces.js';
import { assertOoxmlGraphConservation, preflightOoxmlSnapshot } from '../ooxml/preflight.js';
import { verifyOoxmlReopen } from '../ooxml/reopen-verifier.js';
import {
  OoxmlBlockedError,
  readZip,
  replaceZipEntries,
  type ZipEntry,
} from '../ooxml/zip-guard.js';
import { decodeXmlText, escapeXmlText, xmlElements } from '../ooxml/xml-guard.js';

type State = 'visible' | 'hidden' | 'veryHidden';
type XlsxLocator = Extract<
  FormatLocatorV11,
  { kind: 'xlsx-cell-text' | 'xlsx-raw-value' | 'xlsx-display-value' }
>;
type XlsxOperation = RewriteOperation<XlsxLocator>;
type CandidatePolicy = 'text' | 'formatted-identifier' | 'date' | 'ordinary-number';

export interface XlsxSheet {
  sheetRelId: string;
  sheetId: string;
  name: string;
  state: State;
  part: string;
}

export interface XlsxCell {
  sheetPart: string;
  sheetRelId: string;
  sheetName: string;
  sheetState: State;
  cell: string;
  value: string;
  rawValue: string;
  displayValue: string;
  numberFormat: string;
  numberFormatId: number;
  valueKind: 'inline' | 'shared' | 'raw';
  candidatePolicy: CandidatePolicy;
  locator: XlsxLocator;
}

export interface XlsxReviewItem {
  kind:
    | 'metadata'
    | 'hyperlink'
    | 'sheet-name'
    | 'defined-name'
    | 'table-name'
    | 'style-name'
    | 'font-name'
    | 'theme-name';
  part: string;
  value: string;
  locator: FormatLocatorV11;
  mandatoryReview: true;
}

export interface XlsxExtraction {
  sheets: XlsxSheet[];
  cells: XlsxCell[];
  definedNames: { name: string; value: string; localSheetId?: number; locator: FormatLocatorV11 }[];
  mergedCells: { sheetRelId: string; sheetPart: string; range: string }[];
  reviewItems: XlsxReviewItem[];
  manualReview: string[];
  entryCount: number;
}

const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';

const XLSX_ATTRIBUTE_SURFACES = [
  { part: 'xl/styles.xml', elementQName: 'name', attributeQName: 'val', kind: 'font-name' },
  { part: 'xl/styles.xml', elementQName: 'cellStyle', attributeQName: 'name', kind: 'style-name' },
  {
    part: 'xl/theme/theme1.xml',
    elementQName: 'a:theme',
    attributeQName: 'name',
    kind: 'theme-name',
  },
  {
    part: 'xl/theme/theme1.xml',
    elementQName: 'a:clrScheme',
    attributeQName: 'name',
    kind: 'theme-name',
  },
  {
    part: 'xl/theme/theme1.xml',
    elementQName: 'a:fontScheme',
    attributeQName: 'name',
    kind: 'theme-name',
  },
  {
    part: 'xl/theme/theme1.xml',
    elementQName: 'a:latin',
    attributeQName: 'typeface',
    kind: 'font-name',
  },
  {
    part: 'xl/theme/theme1.xml',
    elementQName: 'a:ea',
    attributeQName: 'typeface',
    kind: 'font-name',
  },
  {
    part: 'xl/theme/theme1.xml',
    elementQName: 'a:cs',
    attributeQName: 'typeface',
    kind: 'font-name',
  },
] as const;

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function attr(text: string, name: string): string | undefined {
  return new RegExp(`(?:\\s|:)${name}=["']([^"']*)["']`, 'u').exec(text)?.[1];
}

function formulaKind(
  opening: string,
  text: string,
): Extract<FormatLocatorV11, { kind: 'xlsx-formula' }>['formulaKind'] {
  const type = attr(opening, 't');
  if (type === 'array') return 'array';
  if (type === 'dataTable') return 'data-table';
  if (type === 'shared') return text ? 'shared-master' : 'shared-follower';
  return 'normal';
}

function formulaFreeProfile(entries: readonly ZipEntry[]): void {
  const blockers: string[] = [];
  const evidence: { code: string; locator?: FormatLocatorV11 }[] = [];
  const sheetRelationshipIds = new Map<string, string>();
  const workbookRelationships = entries.find(
    (entry) => entry.name === 'xl/_rels/workbook.xml.rels',
  );
  if (workbookRelationships) {
    const xml = workbookRelationships.data.toString('utf8');
    for (const relationship of xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/gu)) {
      const type = attr(relationship[1]!, 'Type');
      const id = attr(relationship[1]!, 'Id');
      const target = attr(relationship[1]!, 'Target');
      if (type !== `${REL}worksheet` || !id || !target) continue;
      const partName = target.startsWith('/')
        ? target.slice(1)
        : `xl/${target.replace(/^\.\//u, '')}`;
      sheetRelationshipIds.set(partName, id);
    }
  }
  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    const xml = entry.data.toString('utf8');
    if (/^xl\/worksheets\/sheet\d+\.xml$/u.test(name)) {
      for (const cellNode of xmlElements(xml, 'c')) {
        const cellOpening = xml.slice(cellNode.start, cellNode.innerStart);
        const cellRef = attr(cellOpening, 'r');
        if (!cellRef) continue;
        const formulaNode = xmlElements(cellNode.inner, 'f')[0];
        if (!formulaNode) continue;
        blockers.push('xlsx-formula: save a values-only copy before processing');
        const formulaText = decodeXmlText(formulaNode.inner);
        const formulaOpening = cellNode.inner.slice(formulaNode.start, formulaNode.innerStart);
        const sheetRelId = sheetRelationshipIds.get(entry.name) ?? `unresolved:${entry.name}`;
        const common = {
          partName: entry.name,
          sheetRelId,
          cellRef,
          sourceSurfaceHashSha256: hash(
            `${entry.name}\u0000${sheetRelId}\u0000${cellRef}\u0000${formulaText}`,
          ),
          mapSha256: hash(`${entry.name}\u0000${cellNode.start}\u0000${formulaNode.start}`),
        };
        evidence.push({
          code: 'xlsx-formula',
          locator: {
            kind: 'xlsx-formula',
            ...common,
            formulaKind: formulaKind(formulaOpening, formulaText),
            elementQName: 'x:f',
            startUtf16: 0,
            endUtf16: formulaText.length,
          },
        });
        const cachedNode = xmlElements(cellNode.inner, 'v')[0];
        if (cachedNode) {
          const cached = decodeXmlText(cachedNode.inner);
          evidence.push({
            code: 'xlsx-cached-result',
            locator: {
              kind: 'xlsx-cached-result',
              ...common,
              elementQName: 'x:v',
              startUtf16: 0,
              endUtf16: cached.length,
              sourceSurfaceHashSha256: hash(
                `${entry.name}\u0000${sheetRelId}\u0000${cellRef}\u0000${cached}`,
              ),
              mapSha256: hash(`${entry.name}\u0000${cellNode.start}\u0000${cachedNode.start}`),
            },
          });
        }
      }
    }
    if (name === 'xl/calcchain.xml')
      blockers.push('xlsx-formula-cache: save a values-only copy before processing');
    if (/^xl\/(?:charts|drawings|media)\//u.test(name))
      blockers.push(`xlsx-unsupported-visual:${entry.name}`);
    if (/^xl\/(?:comments|threadedcomments)\//u.test(name) || /\/vmlDrawing\d*\.vml$/u.test(name))
      blockers.push('xlsx-comments: save a values-only copy before processing');
    if (
      /(?:vbaProject\.bin|activex|embeddings|externallinks|connections|pivotcache|pivottables|querytables|slicer)/u.test(
        name,
      )
    )
      blockers.push(`xlsx-unsupported-feature:${entry.name}`);
  }
  if (blockers.length) throw new OoxmlBlockedError([...new Set(blockers)].sort(), evidence);
}

function sharedStrings(
  entries: readonly ZipEntry[],
): { value: string; slices: { run: number; startUtf16: number; endUtf16: number }[] }[] {
  const entry = entries.find((candidate) => candidate.name === 'xl/sharedStrings.xml');
  if (!entry) return [];
  return xmlElements(entry.data.toString('utf8'), 'si').map((si) => {
    let cursor = 0;
    const slices = xmlElements(si.inner, 't').map((node, run) => {
      const text = decodeXmlText(node.inner);
      const slice = { run, startUtf16: cursor, endUtf16: cursor + text.length };
      cursor += text.length;
      return slice;
    });
    return {
      value: xmlElements(si.inner, 't')
        .map((node) => decodeXmlText(node.inner))
        .join(''),
      slices,
    };
  });
}

function styleFormats(entries: readonly ZipEntry[]): { id: number; code: string }[] {
  const entry = entries.find((candidate) => candidate.name === 'xl/styles.xml');
  const defaults = new Map<number, string>([
    [0, 'General'],
    [1, '0'],
    [2, '0.00'],
    [14, 'm/d/yy'],
    [15, 'd-mmm-yy'],
    [16, 'd-mmm'],
    [17, 'mmm-yy'],
    [18, 'h:mm AM/PM'],
    [19, 'h:mm:ss AM/PM'],
    [20, 'h:mm'],
    [21, 'h:mm:ss'],
    [22, 'm/d/yy h:mm'],
  ]);
  if (!entry) return [];
  const xml = entry.data.toString('utf8');
  for (const node of xml.matchAll(/<(?:[A-Za-z_][\w.-]*:)?numFmt\b([^>]*)\/?>/gu)) {
    const id = Number(attr(node[1]!, 'numFmtId'));
    const code = attr(node[1]!, 'formatCode');
    if (Number.isInteger(id) && code !== undefined) defaults.set(id, decodeXmlText(code));
  }
  const cellXfs = xmlElements(xml, 'cellXfs')[0];
  if (!cellXfs) return [];
  return [
    ...cellXfs.inner.matchAll(
      /<(?:[A-Za-z_][\w.-]*:)?xf\b([^>]*?)(?:\/>|>[\s\S]*?<\/(?:[A-Za-z_][\w.-]*:)?xf>)/gu,
    ),
  ].map((node) => {
    const id = Number(attr(node[1]!, 'numFmtId') ?? '0');
    return { id, code: defaults.get(id) ?? 'General' };
  });
}

function isDateFormat(id: number, code: string): boolean {
  return (
    (id >= 14 && id <= 22) ||
    id === 45 ||
    id === 46 ||
    id === 47 ||
    /[dmyhs]/iu.test(code.replace(/"[^"]*"|\[[^\]]*\]/gu, ''))
  );
}

function dateDisplay(raw: string): string {
  const serial = Number(raw);
  if (!Number.isFinite(serial)) return raw;
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.floor(serial) * 86_400_000).toISOString().slice(0, 10);
}

function zeroFormat(raw: string, code: string): string {
  if (!/^[0#?., _*()-]+$/u.test(code) || !/^\d+(?:\.\d+)?$/u.test(raw)) return raw;
  const placeholders = [...code].filter(
    (character) => character === '0' || character === '#',
  ).length;
  if (!placeholders) return raw;
  const digits = raw.replace('.', '').padStart(placeholders, '0');
  let position = digits.length - 1;
  return [...code]
    .reverse()
    .map((character) =>
      character === '0' || character === '#' ? (digits[position--] ?? '0') : character,
    )
    .reverse()
    .join('')
    .replace(/[ _*?]/gu, '');
}

function numericPolicy(
  numberFormatId: number,
  numberFormat: string,
  rawValue: string,
  displayValue: string,
): CandidatePolicy {
  if (isDateFormat(numberFormatId, numberFormat)) return 'date';
  if (
    numberFormat !== 'General' &&
    /[0#]/u.test(numberFormat) &&
    /(?:\d[ -]?){7,}\d/u.test(displayValue) &&
    displayValue !== rawValue
  )
    return 'formatted-identifier';
  return 'ordinary-number';
}

function parseSheets(entries: readonly ZipEntry[]): XlsxSheet[] {
  const workbook = entries.find((entry) => entry.name === 'xl/workbook.xml')?.data.toString('utf8');
  if (!workbook) throw new OoxmlBlockedError(['xlsx-workbook-missing']);
  return [...workbook.matchAll(/<(?:[A-Za-z_][\w.-]*:)?sheet\b([^>]*)\/?>/gu)].map(
    (node, index) => {
      const opening = node[1]!;
      const sheetRelId = attr(opening, 'id');
      const name = attr(opening, 'name');
      const sheetId = attr(opening, 'sheetId');
      const state = (attr(opening, 'state') ?? 'visible') as State;
      if (!sheetRelId || !name || !sheetId || !['visible', 'hidden', 'veryHidden'].includes(state))
        throw new OoxmlBlockedError([`xlsx-sheet-identity:${index}`]);
      return { sheetRelId, sheetId, name: decodeXmlText(name), state, part: '' };
    },
  );
}

function tableNameReview(entries: readonly ZipEntry[]): XlsxReviewItem[] {
  const result: XlsxReviewItem[] = [];
  for (const entry of entries.filter((candidate) =>
    /^xl\/tables\/table\d+\.xml$/u.test(candidate.name),
  )) {
    const xml = entry.data.toString('utf8');
    const opening = /<table\b([^>]*)>/u.exec(xml)?.[1];
    if (!opening) throw new OoxmlBlockedError([`xlsx-table-root:${entry.name}`]);
    const tableId = Number(attr(opening, 'id'));
    if (!Number.isInteger(tableId)) throw new OoxmlBlockedError([`xlsx-table-id:${entry.name}`]);
    for (const attribute of ['name', 'displayName'] as const) {
      const value = decodeXmlText(attr(opening, attribute) ?? '');
      if (!value) continue;
      result.push({
        kind: 'table-name',
        part: entry.name,
        value,
        mandatoryReview: true,
        locator: {
          kind: 'xlsx-table-name',
          partName: entry.name,
          tableId,
          attribute,
          logicalStartUtf16: 0,
          logicalEndUtf16: value.length,
          sourceSurfaceHashSha256: hash(
            `${entry.name}\u0000${tableId}\u0000${attribute}\u0000${value}`,
          ),
          mapSha256: hash(`${entry.name}\u0000${tableId}\u0000${attribute}`),
        },
      });
    }
    result.push(
      ...extractAttributeSurfaces(entries, 'xlsx', [
        {
          part: entry.name,
          elementQName: 'tableColumn',
          attributeQName: 'name',
          kind: 'table-name',
        },
        {
          part: entry.name,
          elementQName: 'tableStyleInfo',
          attributeQName: 'name',
          kind: 'table-name',
        },
      ] as const),
    );
  }
  return result;
}

function scan(source: Buffer): XlsxExtraction {
  formulaFreeProfile(readZip(source));
  const snapshot = preflightOoxmlSnapshot(source, 'xlsx');
  const entries = snapshot.entries;
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const sheets = parseSheets(entries);
  const worksheetTargets = new Map(
    snapshot.relationships
      .filter(
        (relationship) =>
          relationship.source === 'xl/workbook.xml' && relationship.type === `${REL}worksheet`,
      )
      .map((relationship) => [relationship.id, relationship.target]),
  );
  for (const sheet of sheets) {
    const target = worksheetTargets.get(sheet.sheetRelId);
    if (!target || !byName.has(target))
      throw new OoxmlBlockedError([`xlsx-sheet-target:${sheet.sheetRelId}`]);
    sheet.part = target;
  }
  const shared = sharedStrings(entries);
  const styles = styleFormats(entries);
  const cells: XlsxCell[] = [];
  const mergedCells: XlsxExtraction['mergedCells'] = [];
  for (const sheet of sheets) {
    const xml = byName.get(sheet.part)!.data.toString('utf8');
    for (const merged of xml.matchAll(/<(?:[A-Za-z_][\w.-]*:)?mergeCell\b([^>]*)\/?\s*>/gu)) {
      const range = attr(merged[1]!, 'ref');
      if (range) mergedCells.push({ sheetRelId: sheet.sheetRelId, sheetPart: sheet.part, range });
    }
    for (const node of xmlElements(xml, 'c')) {
      const opening = xml.slice(node.start, node.innerStart);
      const cell = attr(opening, 'r');
      if (!cell) continue;
      const type = attr(opening, 't') ?? 'n';
      const styleIndex = Number(attr(opening, 's') ?? '0');
      const style = styles[styleIndex] ?? { id: 0, code: 'General' };
      const rawNode = xmlElements(node.inner, 'v')[0];
      const rawValue = decodeXmlText(rawNode?.inner ?? '');
      const inlineNodes = xmlElements(node.inner, 't');
      const inlineValue = inlineNodes.map((item) => decodeXmlText(item.inner)).join('');
      let valueKind: XlsxCell['valueKind'] = 'raw';
      let value = rawValue;
      let slices: { run: number; startUtf16: number; endUtf16: number }[] | undefined;
      if (type === 's') {
        const sharedValue = shared[Number(rawValue)];
        if (!sharedValue)
          throw new OoxmlBlockedError([`xlsx-shared-string-index:${sheet.part}:${cell}`]);
        value = sharedValue.value;
        slices = sharedValue.slices;
        valueKind = 'shared';
      } else if (type === 'inlineStr') {
        value = inlineValue;
        let cursor = 0;
        slices = inlineNodes.map((item, run) => {
          const text = decodeXmlText(item.inner);
          const slice = { run, startUtf16: cursor, endUtf16: cursor + text.length };
          cursor += text.length;
          return slice;
        });
        valueKind = 'inline';
      }
      const displayValue =
        valueKind === 'raw'
          ? isDateFormat(style.id, style.code)
            ? dateDisplay(rawValue)
            : zeroFormat(rawValue, style.code)
          : value;
      const policy =
        valueKind === 'raw' ? numericPolicy(style.id, style.code, rawValue, displayValue) : 'text';
      const surface = `${sheet.sheetRelId}\u0000${sheet.part}\u0000${cell}\u0000${rawValue}\u0000${displayValue}\u0000${style.id}`;
      const map = JSON.stringify({ valueKind, slices: slices ?? [], numberFormat: style.code });
      const common = { sourceSurfaceHashSha256: hash(surface), mapSha256: hash(map) };
      const locator: XlsxLocator =
        valueKind === 'raw'
          ? {
              kind: 'xlsx-display-value',
              ...common,
              partName: sheet.part,
              sheetRelId: sheet.sheetRelId,
              cellRef: cell,
              rawValueHashSha256: hash(rawValue),
              numberFormatId: style.id,
              displayStartUtf16: 0,
              displayEndUtf16: displayValue.length,
            }
          : {
              kind: 'xlsx-cell-text',
              ...common,
              sheetRelId: sheet.sheetRelId,
              cellRef: cell,
              valueKind,
              ...(slices && slices.length > 1 ? { richTextSlices: slices } : {}),
              logicalStartUtf16: 0,
              logicalEndUtf16: value.length,
            };
      cells.push({
        sheetPart: sheet.part,
        sheetRelId: sheet.sheetRelId,
        sheetName: sheet.name,
        sheetState: sheet.state,
        cell,
        value,
        rawValue,
        displayValue,
        numberFormat: style.code,
        numberFormatId: style.id,
        valueKind,
        candidatePolicy: policy,
        locator,
      });
    }
  }
  const reviewItems: XlsxReviewItem[] = [];
  for (const sheet of sheets) {
    reviewItems.push({
      kind: 'sheet-name',
      part: 'xl/workbook.xml',
      value: sheet.name,
      mandatoryReview: true,
      locator: {
        kind: 'xlsx-sheet-name',
        sheetIndex0: sheets.indexOf(sheet),
        sheetRelId: sheet.sheetRelId,
        logicalStartUtf16: 0,
        logicalEndUtf16: sheet.name.length,
        sourceSurfaceHashSha256: hash(`${sheet.sheetRelId}\u0000${sheet.name}`),
        mapSha256: hash(`${sheet.sheetId}\u0000${sheet.part}`),
      },
    });
  }
  const workbookXml = byName.get('xl/workbook.xml')!.data.toString('utf8');
  const definedNames = xmlElements(workbookXml, 'definedName').map((node, index) => {
    const opening = workbookXml.slice(node.start, node.innerStart);
    const name = decodeXmlText(attr(opening, 'name') ?? '');
    const value = decodeXmlText(node.inner);
    const rawLocalSheetId = attr(opening, 'localSheetId');
    const localSheetId = rawLocalSheetId === undefined ? undefined : Number(rawLocalSheetId);
    const locator: FormatLocatorV11 = {
      kind: 'xlsx-defined-name',
      definedNameIndex0: index,
      ...(localSheetId === undefined ? {} : { localSheetId }),
      logicalStartUtf16: 0,
      logicalEndUtf16: value.length,
      sourceSurfaceHashSha256: hash(`${index}\u0000${name}\u0000${value}`),
      mapSha256: hash(`${rawLocalSheetId ?? ''}\u0000${name}`),
    };
    reviewItems.push({
      kind: 'defined-name',
      part: 'xl/workbook.xml',
      value,
      locator,
      mandatoryReview: true,
    });
    return { name, value, ...(localSheetId === undefined ? {} : { localSheetId }), locator };
  });
  for (const relationship of snapshot.relationships.filter(
    (item) => item.type === `${REL}hyperlink`,
  )) {
    reviewItems.push({
      kind: 'hyperlink',
      part: relationship.relsPart,
      value: relationship.target,
      mandatoryReview: true,
      locator: {
        kind: 'relationship-target',
        package: 'xlsx',
        relsPartName: relationship.relsPart,
        relationshipId: relationship.id,
        targetMode: relationship.targetMode,
        logicalStartUtf16: 0,
        logicalEndUtf16: relationship.target.length,
        sourceSurfaceHashSha256: hash(
          `${relationship.relsPart}\u0000${relationship.id}\u0000${relationship.target}`,
        ),
        mapSha256: hash(`${relationship.source}\u0000${relationship.type}`),
      },
    });
  }
  for (const entry of entries.filter((item) =>
    /^docProps\/(?:core|app|custom)\.xml$/u.test(item.name),
  )) {
    let occurrence = 0;
    const xml = entry.data.toString('utf8');
    for (const match of xml.matchAll(
      /<([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)[^>]*>([^<]+)<\/\1>/gu,
    )) {
      const value = decodeXmlText(match[2]!);
      if (!value) continue;
      reviewItems.push({
        kind: 'metadata',
        part: entry.name,
        value,
        mandatoryReview: true,
        locator: {
          kind: 'ooxml-element-text',
          package: 'xlsx',
          partName: entry.name,
          canonicalElementPath: `/${match[1]}[${occurrence}]`,
          elementQName: match[1]!,
          textNodeIndex: 0,
          startUtf16: 0,
          endUtf16: value.length,
          sourceSurfaceHashSha256: hash(`${entry.name}\u0000${match[1]}\u0000${value}`),
          mapSha256: hash(`${entry.name}\u0000${occurrence++}`),
        },
      });
    }
  }
  reviewItems.push(
    ...tableNameReview(entries),
    ...extractAttributeSurfaces(entries, 'xlsx', XLSX_ATTRIBUTE_SURFACES),
  );
  const manualReview = [
    ...new Set([
      ...reviewItems.map((item) => `${item.kind}:${item.part}`),
      ...entries.filter((entry) => entry.name === 'xl/theme/theme1.xml').map((entry) => entry.name),
    ]),
  ];
  return {
    sheets,
    cells,
    definedNames,
    mergedCells,
    reviewItems,
    manualReview,
    entryCount: entries.length,
  };
}

function currentCell(extraction: XlsxExtraction, locator: XlsxLocator): XlsxCell {
  const cell = extraction.cells.find(
    (candidate) =>
      candidate.sheetRelId === locator.sheetRelId && candidate.cell === locator.cellRef,
  );
  if (
    !cell ||
    cell.locator.kind !== locator.kind ||
    cell.locator.sourceSurfaceHashSha256 !== locator.sourceSurfaceHashSha256 ||
    cell.locator.mapSha256 !== locator.mapSha256
  )
    throw new OoxmlBlockedError(['stale-or-forged-xlsx-locator']);
  return cell;
}

function replacementValue(current: XlsxCell, operation: XlsxOperation): string {
  const locator = operation.locator;
  if (locator.kind === 'xlsx-cell-text') {
    const start = locator.logicalStartUtf16;
    const end = locator.logicalEndUtf16;
    if (start < 0 || end < start || end > current.value.length)
      throw new OoxmlBlockedError(['invalid-xlsx-logical-span']);
    if (locator.richTextSlices && locator.richTextSlices.length > 1)
      throw new OoxmlBlockedError(['xlsx-rich-text-rewrite-not-yet-closed']);
    return current.value.slice(0, start) + operation.replacement + current.value.slice(end);
  }
  if (locator.kind === 'xlsx-display-value') {
    if (locator.displayStartUtf16 !== 0 || locator.displayEndUtf16 !== current.displayValue.length)
      throw new OoxmlBlockedError(['invalid-xlsx-display-span']);
    return operation.replacement;
  }
  if (locator.startUtf16 !== 0 || locator.endUtf16 !== current.rawValue.length)
    throw new OoxmlBlockedError(['invalid-xlsx-raw-span']);
  return operation.replacement;
}

function rewritePart(
  xml: string,
  operations: readonly XlsxOperation[],
  extraction: XlsxExtraction,
): string {
  const replacements = new Map<string, string>();
  for (const operation of operations) {
    const current = currentCell(extraction, operation.locator);
    if (replacements.has(current.cell)) throw new OoxmlBlockedError(['overlapping-xlsx-locator']);
    replacements.set(current.cell, replacementValue(current, operation));
  }
  let output = xml;
  for (const node of xmlElements(xml, 'c').sort((left, right) => right.start - left.start)) {
    const opening = xml.slice(node.start, node.innerStart);
    const cellRef = attr(opening, 'r');
    if (!cellRef || !replacements.has(cellRef)) continue;
    const attrs = opening.slice(2, -1).replace(/\s+t=["'][^"']*["']/gu, '');
    const value = replacements.get(cellRef)!;
    const space = /^\s|\s$/u.test(value) ? ' xml:space="preserve"' : '';
    output = `${output.slice(0, node.start)}<c${attrs} t="inlineStr"><is><t${space}>${escapeXmlText(value)}</t></is></c>${output.slice(node.end)}`;
  }
  return output;
}

function independentReopen(artifact: Buffer): XlsxExtraction {
  const directory = mkdtempSync(join(tmpdir(), 'hans-safedoc-xlsx-'));
  const path = join(directory, 'artifact.xlsx');
  try {
    writeFileSync(path, artifact, { flag: 'wx', mode: 0o600 });
    const diskArtifact = readFileSync(path);
    verifyOoxmlReopen(diskArtifact, 'xlsx');
    return scan(diskArtifact);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function verifyArtifact(source: Buffer, artifact: Buffer) {
  const before = new Map(readZip(source).map((entry) => [entry.name, entry.data]));
  const after = new Map(readZip(artifact).map((entry) => [entry.name, entry.data]));
  if (before.size !== after.size) throw new OoxmlBlockedError(['xlsx-entry-canary']);
  const unchangedEntries: string[] = [];
  const changedEntries: string[] = [];
  for (const [name, data] of before) {
    const output = after.get(name);
    if (!output) throw new OoxmlBlockedError(['xlsx-entry-canary']);
    (data.equals(output) ? unchangedEntries : changedEntries).push(name);
  }
  return { unchangedEntries: unchangedEntries.sort(), changedEntries: changedEntries.sort() };
}

function rewrite(source: Buffer, operations: readonly XlsxOperation[]): Buffer;
function rewrite(source: Buffer, operations: readonly RewriteOperation[]): Buffer;
function rewrite(source: Buffer, operations: readonly RewriteOperation[]): Buffer {
  const typedOperations = operations as readonly XlsxOperation[];
  const extraction = scan(source);
  const entries = readZip(source);
  const changes = new Map<string, Buffer>();
  for (const part of new Set(
    typedOperations.map((operation) => currentCell(extraction, operation.locator).sheetPart),
  )) {
    const entry = entries.find((candidate) => candidate.name === part);
    if (!entry) throw new OoxmlBlockedError(['xlsx-locator-part-not-found']);
    changes.set(
      part,
      Buffer.from(
        rewritePart(
          entry.data.toString('utf8'),
          typedOperations.filter(
            (operation) => currentCell(extraction, operation.locator).sheetPart === part,
          ),
          extraction,
        ),
      ),
    );
  }
  const artifact = replaceZipEntries(source, changes);
  independentReopen(artifact);
  // A typed cell rewrite can intentionally convert <v> into <is><t>; part,
  // content-type, and relationship topology must still remain byte-for-byte equivalent.
  assertOoxmlGraphConservation(source, artifact, 'xlsx', {
    allowTypedTextSurfaceChange: true,
  });
  const canary = verifyArtifact(source, artifact);
  if (canary.changedEntries.some((entry) => !changes.has(entry)))
    throw new OoxmlBlockedError(['xlsx-entry-canary']);
  return artifact;
}

export const xlsxAdapter = {
  id: 'hsd-xlsx-v1.1',
  version: '1.1.0' as const,
  extract: scan,
  rewrite,
  reopen: independentReopen,
  residual(artifact: Buffer, needles: readonly string[]) {
    const extraction = independentReopen(artifact);
    const values = [
      ...extraction.cells.flatMap((cell) => [cell.value, cell.rawValue, cell.displayValue]),
      ...extraction.reviewItems.map((item) => item.value),
    ].join('\n');
    return needles.filter((needle) => values.includes(needle));
  },
  verifyReopen: (artifact: Buffer) => verifyOoxmlReopen(artifact, 'xlsx'),
  verifyArtifact,
};

export { OoxmlBlockedError };
