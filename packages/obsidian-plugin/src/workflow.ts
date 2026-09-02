import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  assignEntityTokens,
  buildShadowVault,
  createPathMap,
  detectAll,
  encodeCrockfordBase32,
  err,
  error,
  ok,
  preferredDisplay,
  splitTaiwanAddressForPrivacy,
  tokenizeDocument,
  type AddressPrivacyMode,
  type DetectedCandidate,
  type Result,
  type SafeJobEntity,
} from '@privacy-bridge/core';

export type CandidateDecision = 'ACCEPTED' | 'IGNORED';
export type CandidateDecisions = Readonly<Record<string, CandidateDecision | undefined>>;

export interface PreparedReviewedDocument {
  readonly jobId: string;
  readonly candidates: readonly DetectedCandidate[];
  readonly sourceContent: string;
  readonly sanitizedContent: string;
  readonly previewChanges: readonly PreviewChange[];
  readonly previewHunks: readonly PreviewHunk[];
  readonly sourceSha256: string;
  readonly documentId: string;
  readonly tokenKey: Uint8Array;
  readonly mapping: readonly SafeJobEntity[];
  readonly addressPrivacyMode: AddressPrivacyMode;
  readonly addressFallbackCount: number;
}

export interface PrepareReviewedDocumentOptions {
  readonly addressPrivacyMode?: AddressPrivacyMode;
}

export interface PreviewChange {
  readonly candidateId: string;
  readonly type: string;
  readonly before: string;
  readonly after: string;
  readonly decision: CandidateDecision;
  readonly start: number;
  readonly end: number;
}

export interface PreviewHunk {
  readonly lineNumber: number;
  readonly collapsedBefore: number;
  readonly beforeLine: string;
  readonly afterLine: string;
  readonly displayAfterLine: string;
  readonly types: readonly string[];
}

const DISPLAY_TYPE_NAMES: Readonly<Record<string, string>> = {
  TW_ID: '身分證',
  TW_ARC: '居留證',
  TW_TAX_ID: '統一編號',
  TW_PASSPORT: '護照',
  PASSPORT_CANDIDATE: '疑似護照號碼',
  TW_NHI_CARD: '健保卡號',
  TW_MOBILE: '手機',
  TW_LANDLINE: '市話',
  TW_PHONE_SERVICE: '服務電話',
  TW_ADDRESS: '地址',
  TW_POSTCODE: '郵遞區號',
  TW_PLATE: '車牌',
  TW_INVOICE: '發票號碼',
  TW_BANK_ACCOUNT: '銀行帳號',
  CREDIT_CARD: '信用卡',
  EMAIL: '電子郵件',
  IPV4: '網路位址',
  URL: '網址',
  LINE_ID: 'LINE 帳號',
  SECRET: '機密字串',
  AMBIGUOUS_IDENTIFIER: '無法判定類型的識別碼',
  PERSON: '人名',
  ORGANIZATION: '組織',
  PROJECT: '專案',
  PRODUCT: '產品',
  DEPARTMENT: '部門',
  SYSTEM: '系統',
  CUSTOM_TERM: '自訂詞',
};

export const displayTypeName = (type: string): string => DISPLAY_TYPE_NAMES[type] ?? '其他敏感資料';

export function buildPreviewHunks(
  source: string,
  changes: readonly PreviewChange[],
): readonly PreviewHunk[] {
  const displayTokens = new Map<string, string>();
  const typeCounts = new Map<string, number>();
  for (const change of [...changes]
    .filter((candidate) => candidate.decision === 'ACCEPTED')
    .sort((left, right) => left.start - right.start)) {
    const count = (typeCounts.get(change.type) ?? 0) + 1;
    typeCounts.set(change.type, count);
    const typeName = displayTypeName(change.type);
    displayTokens.set(change.candidateId, `⟦${typeName}代碼 ${String(count).padStart(2, '0')}⟧`);
  }
  const groups = new Map<number, PreviewChange[]>();
  for (const change of changes) {
    if (change.decision !== 'ACCEPTED') continue;
    const lineStart = source.lastIndexOf('\n', Math.max(0, change.start - 1)) + 1;
    const group = groups.get(lineStart) ?? [];
    group.push(change);
    groups.set(lineStart, group);
  }
  let previousLine = 0;
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([lineStart, lineChanges]) => {
      const lineEnd = source.indexOf('\n', lineStart);
      const end = lineEnd === -1 ? source.length : lineEnd;
      const beforeLine = source.slice(lineStart, end);
      const lineNumber = source.slice(0, lineStart).split('\n').length;
      let afterLine = beforeLine;
      let displayAfterLine = beforeLine;
      for (const change of [...lineChanges].sort((left, right) => right.start - left.start)) {
        const start = change.start - lineStart;
        const finish = change.end - lineStart;
        afterLine = `${afterLine.slice(0, start)}${change.after}${afterLine.slice(finish)}`;
        displayAfterLine = `${displayAfterLine.slice(0, start)}${displayTokens.get(change.candidateId) ?? change.after}${displayAfterLine.slice(finish)}`;
      }
      const hunk: PreviewHunk = {
        lineNumber,
        collapsedBefore: Math.max(0, lineNumber - previousLine - 1),
        beforeLine,
        afterLine,
        displayAfterLine,
        types: [...new Set(lineChanges.map((change) => change.type))],
      };
      previousLine = lineNumber;
      return hunk;
    });
}

export interface PublishPreparedDocumentInput {
  readonly vaultRoot: string;
  readonly configDir: string;
  readonly outputParent: string;
  readonly relativePath: string;
  readonly currentContent: string;
  readonly prepared: PreparedReviewedDocument;
}

export interface SyntheticDocumentWorkflowOutput {
  readonly jobId: string;
  readonly candidates: readonly DetectedCandidate[];
  readonly outputRoot: string;
  readonly outputFile: string;
  readonly sourceSha256: string;
}

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function createJobId(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = encodeCrockfordBase32(randomBytes(10)).slice(0, 10);
  return `PB-${date}-${suffix}`;
}

export function scanSyntheticDocument(content: string): Result<readonly DetectedCandidate[]> {
  return detectAll(content);
}

export function prepareReviewedDocument(
  source: string,
  candidates: readonly DetectedCandidate[],
  decisions: CandidateDecisions,
  options: PrepareReviewedDocumentOptions = {},
): Result<PreparedReviewedDocument> {
  if (candidates.some((candidate) => candidate.handling === 'BLOCK_EXPORT'))
    return err(error('PB-DEMO-SECRET-BLOCK'));
  if (candidates.some((candidate) => decisions[candidate.candidateId] === undefined))
    return err(error('PB-REVIEW-001'));
  const accepted = candidates.filter(
    (candidate) =>
      candidate.handling === 'TOKENIZE' && decisions[candidate.candidateId] === 'ACCEPTED',
  );
  const addressPrivacyMode = options.addressPrivacyMode ?? 'FULL_REDACTION';
  const privacySplits = accepted.map((candidate) =>
    candidate.primaryType === 'TW_ADDRESS'
      ? splitTaiwanAddressForPrivacy(candidate.surfaceText, addressPrivacyMode)
      : {
          mode: 'FULL_REDACTION' as const,
          publicPrefix: '',
          protectedDetail: candidate.surfaceText,
          fellBackToFullRedaction: false,
        },
  );
  const jobId = createJobId();
  const tokenKey = new Uint8Array(randomBytes(32));
  const assignments = assignEntityTokens(
    tokenKey,
    jobId,
    accepted.map((candidate) => ({
      type: candidate.primaryType,
      value: candidate.surfaceText,
    })),
  );
  const sanitized = tokenizeDocument(
    source,
    accepted.map((candidate, index) => ({
      start: candidate.start + privacySplits[index]!.publicPrefix.length,
      end: candidate.end,
      sourceTextHash: createHash('sha256')
        .update(privacySplits[index]!.protectedDetail, 'utf8')
        .digest('hex'),
      token: assignments[index]!.token,
      handling: 'TOKENIZE' as const,
    })),
  );
  if (!sanitized.ok) return sanitized;
  const tokens = new Map(
    accepted.map((candidate, index) => [candidate.candidateId, assignments[index]!.token]),
  );
  const displaysByToken = new Map<string, string[]>();
  for (const [index] of accepted.entries()) {
    const token = assignments[index]!.token;
    displaysByToken.set(token, [
      ...(displaysByToken.get(token) ?? []),
      privacySplits[index]!.protectedDetail,
    ]);
  }
  const mapping: SafeJobEntity[] = [];
  for (const [index, assignment] of assignments.entries()) {
    if (mapping.some((entity) => entity.token === assignment.token)) continue;
    const display = preferredDisplay(displaysByToken.get(assignment.token) ?? []);
    if (!display.ok) {
      tokenKey.fill(0);
      return display;
    }
    mapping.push({
      token: assignment.token,
      type: accepted[index]!.primaryType,
      preferredDisplay: display.value,
    });
  }
  const previewChanges: readonly PreviewChange[] = candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    type: candidate.primaryType,
    before: candidate.surfaceText,
    after:
      candidate.primaryType === 'TW_ADDRESS' && tokens.has(candidate.candidateId)
        ? `${splitTaiwanAddressForPrivacy(candidate.surfaceText, addressPrivacyMode).publicPrefix}${tokens.get(candidate.candidateId)}`
        : (tokens.get(candidate.candidateId) ?? candidate.surfaceText),
    decision: decisions[candidate.candidateId]!,
    start: candidate.start,
    end: candidate.end,
  }));
  return ok({
    jobId,
    candidates,
    sourceContent: source,
    sanitizedContent: sanitized.value,
    previewChanges,
    previewHunks: buildPreviewHunks(source, previewChanges),
    sourceSha256: sha256(source),
    documentId: randomUUID(),
    tokenKey,
    mapping,
    addressPrivacyMode,
    addressFallbackCount: privacySplits.filter((split) => split.fellBackToFullRedaction).length,
  });
}

/** Publishes only a reviewed preview and checks the source snapshot before any disk write. */
export async function publishPreparedDocument(
  input: PublishPreparedDocumentInput,
): Promise<Result<SyntheticDocumentWorkflowOutput>> {
  if (sha256(input.currentContent) !== input.prepared.sourceSha256)
    return err(error('PB-FILE-004'));
  const { documentId } = input.prepared;
  const pathMap = createPathMap([{ documentId, relativePath: input.relativePath }]);
  if (!pathMap.ok) return pathMap;

  await mkdir(input.outputParent, { recursive: true, mode: 0o700 });
  const content = new TextEncoder().encode(input.prepared.sanitizedContent);
  const shadow = await buildShadowVault({
    jobId: input.prepared.jobId,
    sourceRoot: input.vaultRoot,
    configDir: input.configDir,
    outputParent: input.outputParent,
    documents: [
      {
        documentId,
        sourceRelativePath: input.relativePath,
        sourceSha256: createHash('sha256').update(content).digest('hex'),
        content,
      },
    ],
    pathMap: pathMap.value,
  });
  if (!shadow.ok) return shadow;
  const file = shadow.value.files[0];
  if (!file) return err(error('PB-EXPORT-003'));

  return ok({
    jobId: input.prepared.jobId,
    candidates: input.prepared.candidates,
    outputRoot: shadow.value.root,
    outputFile: join(shadow.value.root, file.relativePath),
    sourceSha256: input.prepared.sourceSha256,
  });
}
