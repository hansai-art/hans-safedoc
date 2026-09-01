import { createHash } from 'node:crypto';
import { err, error, ok, parseResultPackage, type Result } from './index.js';
import { verifyToken } from './tokenization.js';
export const RESULT_LIMIT = 25 * 1024 * 1024;
const RESULT_MAX_JSON_DEPTH = 64;
export interface RestoreEntity {
  readonly token: string;
  readonly preferredDisplay: string;
}
export function validateResultBytes(
  bytes: Uint8Array,
  expected: {
    jobId: string;
    packageHash: string;
    tokenKey: Uint8Array;
    documentIds: ReadonlySet<string>;
    knownTokens: ReadonlySet<string>;
  },
): Result<Record<string, unknown>> {
  if (bytes.byteLength > RESULT_LIMIT) return err(error('PB-IMPORT-005'));
  if (!withinJsonDepth(bytes)) return err(error('PB-IMPORT-005'));
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return err(error('PB-IMPORT-001'));
  }
  const parsed = parseResultPackage(value);
  if (!parsed.ok) return err(error('PB-IMPORT-001'));
  const result = parsed.value as Record<string, unknown>;
  if (result.jobId !== expected.jobId || result.sourcePackageHash !== expected.packageHash)
    return err(error('PB-IMPORT-002'));
  const ids = new Set<string>();
  for (const finding of result.findings as Record<string, unknown>[]) {
    if (ids.has(finding.findingId as string)) return err(error('PB-IMPORT-003'));
    ids.add(finding.findingId as string);
    for (const id of finding.sourceDocumentIds as string[])
      if (!expected.documentIds.has(id)) return err(error('PB-IMPORT-003'));
    for (const evidence of (finding.evidence ?? []) as Record<string, unknown>[])
      if (!expected.documentIds.has(evidence.documentId as string))
        return err(error('PB-IMPORT-003'));
    for (const token of finding.entityRefs as string[])
      if (
        !expected.knownTokens.has(token) ||
        !verifyToken(token, expected.tokenKey, expected.jobId).ok
      )
        return err(error('PB-IMPORT-003'));
    for (const text of [
      finding.summary,
      ...((finding.evidence ?? []) as Record<string, unknown>[]).map((item) => item.excerpt),
    ]) {
      if (
        typeof text !== 'string' ||
        !tokensBelongToJob(text, expected.tokenKey, expected.jobId, expected.knownTokens)
      )
        return err(error('PB-IMPORT-003'));
    }
  }
  return ok(result);
}
/** Reject structurally hostile JSON before JSON.parse allocates a deeply nested object graph. */
function withinJsonDepth(bytes: Uint8Array): boolean {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const byte of bytes) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (byte === 0x5c) escaped = true;
      else if (byte === 0x22) quoted = false;
      continue;
    }
    if (byte === 0x22) quoted = true;
    else if (byte === 0x7b || byte === 0x5b) {
      depth += 1;
      if (depth > RESULT_MAX_JSON_DEPTH) return false;
    } else if (byte === 0x7d || byte === 0x5d) {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return !quoted && !escaped && depth === 0;
}
function tokensBelongToJob(
  value: string,
  key: Uint8Array,
  jobId: string,
  knownTokens: ReadonlySet<string>,
): boolean {
  const starts = value.match(/⟦PB:/gu) ?? [];
  const tokens = value.match(/⟦PB:[^⟧]*⟧/gu) ?? [];
  return (
    starts.length === tokens.length &&
    tokens.every((token) => knownTokens.has(token) && verifyToken(token, key, jobId).ok)
  );
}
export function escapeResultMarkdown(value: string): string {
  return value
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, '\\[$1\\]')
    .replace(/obsidian:\/\//giu, 'obsidian&#58;//');
}
export function restoreText(value: string, entities: readonly RestoreEntity[]): Result<string> {
  let out = value;
  for (const entity of entities) out = out.split(entity.token).join(entity.preferredDisplay);
  return /⟦PB:/u.test(out) ? err(error('PB-IMPORT-003')) : ok(out);
}
export const resultHash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
