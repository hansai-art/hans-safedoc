import { createHash } from 'node:crypto';
import { err, error, ok, type Result } from './index.js';
import type { CandidateType, DetectedCandidate, Handling } from './detection.js';

export interface DictionaryEntry {
  readonly term: string;
  readonly type: CandidateType;
  readonly aliases?: readonly string[];
  readonly caseSensitive?: boolean;
  readonly handling?: Handling | 'REDACT';
  readonly ignore?: boolean;
}
export interface Dictionary {
  readonly entries: readonly DictionaryEntry[];
}
export const DICTIONARY_LIMITS = {
  bytes: 25 * 1024 * 1024,
  entries: 50_000,
  termCodePoints: 256,
  aliases: 20,
} as const;
const points = (value: string) => [...value].length;
const CANDIDATE_TYPES = new Set<CandidateType>([
  'TW_ID',
  'TW_ARC',
  'TW_TAX_ID',
  'TW_PASSPORT',
  'PASSPORT_CANDIDATE',
  'TW_NHI_CARD',
  'TW_MOBILE',
  'TW_LANDLINE',
  'TW_PHONE_SERVICE',
  'TW_ADDRESS',
  'TW_POSTCODE',
  'TW_PLATE',
  'TW_INVOICE',
  'TW_BANK_ACCOUNT',
  'PERSON',
  'ORGANIZATION',
  'PROJECT',
  'PRODUCT',
  'DEPARTMENT',
  'SYSTEM',
  'CUSTOM_TERM',
  'CREDIT_CARD',
  'EMAIL',
  'IPV4',
  'URL',
  'LINE_ID',
  'SECRET',
  'AMBIGUOUS_IDENTIFIER',
]);
const DICTIONARY_ENTRY_KEYS = new Set([
  'term',
  'type',
  'aliases',
  'caseSensitive',
  'handling',
  'ignore',
]);
export function validateDictionaryImport(bytes: Uint8Array): Result<Dictionary> {
  if (bytes.byteLength > DICTIONARY_LIMITS.bytes) return err(error('PB-SEC-004'));
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      Object.keys(parsed).some((key) => key !== 'entries') ||
      !Array.isArray((parsed as { entries?: unknown }).entries)
    )
      return err(error('PB-SCHEMA-001'));
    const dictionary = parsed as Dictionary;
    if (
      dictionary.entries.length > DICTIONARY_LIMITS.entries ||
      dictionary.entries.some(
        (e) =>
          !e ||
          typeof e !== 'object' ||
          Array.isArray(e) ||
          Object.keys(e).some((key) => !DICTIONARY_ENTRY_KEYS.has(key)) ||
          typeof e.term !== 'string' ||
          points(e.term) === 0 ||
          points(e.term) > DICTIONARY_LIMITS.termCodePoints ||
          typeof e.type !== 'string' ||
          !CANDIDATE_TYPES.has(e.type) ||
          (e.caseSensitive !== undefined && typeof e.caseSensitive !== 'boolean') ||
          (e.ignore !== undefined && e.ignore !== false) ||
          (e.handling !== undefined &&
            e.handling !== 'TOKENIZE' &&
            e.handling !== 'BLOCK_EXPORT' &&
            e.handling !== 'REDACT') ||
          (e.aliases !== undefined && !Array.isArray(e.aliases)) ||
          (e.aliases?.length ?? 0) > DICTIONARY_LIMITS.aliases ||
          e.aliases?.some(
            (a) =>
              typeof a !== 'string' ||
              points(a) === 0 ||
              points(a) > DICTIONARY_LIMITS.termCodePoints,
          ),
      )
    )
      return err(error('PB-SEC-004'));
    return ok(dictionary);
  } catch {
    return err(error('PB-SCHEMA-001'));
  }
}

function normalizedSearchSurface(source: string): {
  readonly text: string;
  readonly sourceBoundary: ReadonlyMap<number, number>;
} {
  const parts: string[] = [];
  const sourceBoundary = new Map<number, number>([[0, 0]]);
  let normalizedOffset = 0;
  for (const segment of new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(source)) {
    const normalized = segment.segment.normalize('NFC');
    sourceBoundary.set(normalizedOffset, segment.index);
    normalizedOffset += normalized.length;
    sourceBoundary.set(normalizedOffset, segment.index + segment.segment.length);
    parts.push(normalized);
  }
  return { text: parts.join(''), sourceBoundary };
}

export function mergeDictionaries(client: Dictionary, override: Dictionary): Dictionary {
  const keys = new Set(override.entries.map((e) => e.term.normalize('NFC')));
  return {
    entries: [
      ...override.entries,
      ...client.entries.filter((e) => !keys.has(e.term.normalize('NFC'))),
    ],
  };
}
export function matchDictionary(
  source: string,
  dictionary: Dictionary,
): readonly DetectedCandidate[] {
  const matches: DetectedCandidate[] = [];
  const searchable = normalizedSearchSurface(source);
  for (const entry of dictionary.entries) {
    if (entry.ignore) continue;
    for (const form of [entry.term, ...(entry.aliases ?? [])]) {
      const needle = form.normalize('NFC');
      const re = new RegExp(
        needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        entry.caseSensitive ? 'gu' : 'giu',
      );
      for (const m of searchable.text.matchAll(re)) {
        if (m.index === undefined) continue;
        const start = searchable.sourceBoundary.get(m.index);
        const end = searchable.sourceBoundary.get(m.index + m[0].length);
        if (start === undefined || end === undefined || end <= start) continue;
        const surfaceText = source.slice(start, end);
        matches.push({
          candidateId: createHash('sha256')
            .update(`${start}|${entry.type}|dictionary`)
            .digest('hex')
            .slice(0, 32),
          primaryType: entry.type,
          alternativeTypes: [],
          surfaceText,
          start,
          end,
          ruleScore: 1,
          handling: entry.handling === 'REDACT' ? 'BLOCK_EXPORT' : (entry.handling ?? 'TOKENIZE'),
          matchedRules: ['dictionary-exact'],
          evidence: [],
          sourceTextHash: createHash('sha256').update(surfaceText).digest('hex'),
        });
      }
    }
  }
  return matches
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter(
      (match, index, all) =>
        !all.slice(0, index).some((kept) => match.start < kept.end && kept.start < match.end),
    );
}

/** Combines rule and dictionary findings without ever downgrading a blocking candidate. */
export function mergeCandidateDetections(
  deterministic: readonly DetectedCandidate[],
  dictionary: readonly DetectedCandidate[],
): readonly DetectedCandidate[] {
  const ranked = [...deterministic, ...dictionary].sort(
    (left, right) =>
      Number(right.handling === 'BLOCK_EXPORT') - Number(left.handling === 'BLOCK_EXPORT') ||
      right.end - right.start - (left.end - left.start) ||
      right.ruleScore - left.ruleScore ||
      left.start - right.start ||
      left.candidateId.localeCompare(right.candidateId),
  );
  const selected: DetectedCandidate[] = [];
  for (const candidate of ranked) {
    const overlapIndex = selected.findIndex(
      (kept) => candidate.start < kept.end && kept.start < candidate.end,
    );
    if (overlapIndex < 0) {
      selected.push(candidate);
      continue;
    }
    const winner = selected[overlapIndex]!;
    selected[overlapIndex] = {
      ...winner,
      handling:
        winner.handling === 'BLOCK_EXPORT' || candidate.handling === 'BLOCK_EXPORT'
          ? 'BLOCK_EXPORT'
          : 'TOKENIZE',
      matchedRules: [...new Set([...winner.matchedRules, ...candidate.matchedRules])],
      evidence: [...winner.evidence, ...candidate.evidence],
      alternativeTypes: [
        ...new Set([
          ...winner.alternativeTypes,
          ...(candidate.primaryType === winner.primaryType ? [] : [candidate.primaryType]),
          ...candidate.alternativeTypes,
        ]),
      ],
    };
  }
  return selected.sort((left, right) => left.start - right.start || left.end - right.end);
}
