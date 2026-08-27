import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  encodeCrockfordBase32,
  err,
  error,
  ok,
  tokenFor,
  type Result,
} from './index.js';
import type { CandidateType } from './detection.js';
export const canonicalize = (type: CandidateType, value: string) =>
  type === 'TW_ID' || type === 'TW_ARC'
    ? value.toUpperCase().replace(/[\s-]/g, '')
    : type === 'EMAIL'
      ? `${value.slice(0, value.lastIndexOf('@'))}@${value.slice(value.lastIndexOf('@') + 1).toLowerCase()}`
      : value.normalize('NFC');
export const createEntityId = () => encodeCrockfordBase32(randomBytes(10));
export function verifyToken(
  value: string,
  key: Uint8Array,
  jobId: string,
): Result<{ type: string; entityId: string }> {
  const match =
    /^⟦PB:([A-Z][A-Z0-9_]{1,31}):([0-9A-HJKMNP-TV-Z]{16}):([0-9A-HJKMNP-TV-Z]{20})⟧$/.exec(value);
  if (!match) return err(error('PB-IMPORT-003'));
  try {
    const expected = tokenFor(key, jobId, match[1]!, match[2]!);
    return timingSafeEqual(Buffer.from(expected), Buffer.from(value))
      ? ok({ type: match[1]!, entityId: match[2]! })
      : err(error('PB-IMPORT-003'));
  } catch {
    return err(error('PB-IMPORT-003'));
  }
}
export function tokenizeDocument(
  source: string,
  replacements: readonly {
    start: number;
    end: number;
    sourceTextHash: string;
    token: string;
    handling: 'TOKENIZE';
  }[],
): Result<string> {
  let out = source;
  for (const r of [...replacements].sort((a, b) => b.start - a.start)) {
    if (
      r.start < 0 ||
      r.end <= r.start ||
      r.end > source.length ||
      createHash('sha256').update(source.slice(r.start, r.end)).digest('hex') !== r.sourceTextHash
    )
      return err(error('PB-FILE-004'));
    out = out.slice(0, r.start) + r.token + out.slice(r.end);
  }
  return ok(out);
}
