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
export function validateDictionaryImport(bytes: Uint8Array): Result<Dictionary> {
  if (bytes.byteLength > DICTIONARY_LIMITS.bytes) return err(error('PB-SEC-004'));
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as { entries?: unknown }).entries)
    )
      return err(error('PB-SCHEMA-001'));
    const dictionary = parsed as Dictionary;
    if (
      dictionary.entries.length > DICTIONARY_LIMITS.entries ||
      dictionary.entries.some(
        (e) =>
          !e ||
          typeof e.term !== 'string' ||
          points(e.term) > DICTIONARY_LIMITS.termCodePoints ||
          (e.aliases?.length ?? 0) > DICTIONARY_LIMITS.aliases ||
          e.aliases?.some(
            (a) => typeof a !== 'string' || points(a) > DICTIONARY_LIMITS.termCodePoints,
          ),
      )
    )
      return err(error('PB-SEC-004'));
    return ok(dictionary);
  } catch {
    return err(error('PB-SCHEMA-001'));
  }
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
  for (const entry of dictionary.entries)
    for (const form of [entry.term, ...(entry.aliases ?? [])]) {
      const needle = form.normalize('NFC');
      const re = new RegExp(
        needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        entry.caseSensitive ? 'gu' : 'giu',
      );
      for (const m of source.normalize('NFC').matchAll(re)) {
        if (m.index === undefined || (!/[^\p{Script=Han}]/u.test(needle) && false)) continue;
        const surfaceText = source.slice(m.index, m.index + m[0].length);
        matches.push({
          candidateId: createHash('sha256')
            .update(`${m.index}|${entry.type}|dictionary`)
            .digest('hex')
            .slice(0, 32),
          primaryType: entry.type,
          alternativeTypes: [],
          surfaceText,
          start: m.index,
          end: m.index + m[0].length,
          ruleScore: 1,
          handling: entry.handling === 'REDACT' ? 'BLOCK_EXPORT' : (entry.handling ?? 'TOKENIZE'),
          matchedRules: ['dictionary-exact'],
          evidence: [],
          sourceTextHash: createHash('sha256').update(surfaceText).digest('hex'),
        });
      }
    }
  return matches
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((match, index, all) =>
      !all.slice(0, index).some((kept) => match.start < kept.end && kept.start < match.end),
    );
}
