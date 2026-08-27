import { createHash, randomUUID } from 'node:crypto';
import { ok, type Result } from './index.js';

export type CandidateType =
  'EMAIL' | 'SECRET' | 'TW_PHONE_SERVICE' | 'TW_MOBILE' | 'TW_LANDLINE' | 'TW_PASSPORT';
export interface DetectedCandidate {
  readonly candidateId: string;
  readonly primaryType: CandidateType;
  readonly surfaceText: string;
  readonly start: number;
  readonly end: number;
  readonly ruleScore: number;
  readonly handling: 'TOKENIZE' | 'BLOCK_EXPORT';
  readonly matchedRules: readonly string[];
  readonly sourceTextHash: string;
}
const candidate = (
  text: string,
  start: number,
  end: number,
  primaryType: CandidateType,
  handling: 'TOKENIZE' | 'BLOCK_EXPORT',
  rule: string,
  score: number,
): DetectedCandidate => ({
  candidateId: randomUUID(),
  primaryType,
  surfaceText: text.slice(start, end),
  start,
  end,
  ruleScore: score,
  handling,
  matchedRules: [rule],
  sourceTextHash: createHash('sha256').update(text.slice(start, end), 'utf8').digest('hex'),
});
export function detectAll(source: string): Result<readonly DetectedCandidate[]> {
  const found: DetectedCandidate[] = [];
  const add = (
    regex: RegExp,
    type: CandidateType,
    handling: 'TOKENIZE' | 'BLOCK_EXPORT',
    rule: string,
    score: number,
    capture = 0,
  ) => {
    for (const match of source.matchAll(regex)) {
      const value = match[capture];
      if (value === undefined || match.index === undefined) continue;
      const offset = match[0].indexOf(value);
      found.push(
        candidate(
          source,
          match.index + offset,
          match.index + offset + value.length,
          type,
          handling,
          rule,
          score,
        ),
      );
    }
  };
  add(
    /(?:password|密碼|api[_ -]?key|token)\s*[:=]\s*([^\s]+)/gimu,
    'SECRET',
    'BLOCK_EXPORT',
    'secret-value',
    1,
    1,
  );
  add(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, 'EMAIL', 'TOKENIZE', 'email-address', 0.97);
  add(
    /(?:\+886[- ]?|0)99[- ]?\d{3}[- ]?\d{3,4}/gu,
    'TW_PHONE_SERVICE',
    'TOKENIZE',
    'tw-phone-service',
    0.9,
  );
  add(/(?:\+886[- ]?|0)9[0-8]\d[- ]?\d{3}[- ]?\d{3}/gu, 'TW_MOBILE', 'TOKENIZE', 'tw-mobile', 0.9);
  return ok(found.sort((a, b) => a.start - b.start || b.end - a.end));
}
