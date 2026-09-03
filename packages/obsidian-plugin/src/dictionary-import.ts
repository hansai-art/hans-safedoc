import {
  DICTIONARY_LIMITS,
  err,
  error,
  ok,
  validateDictionaryImport,
  type CandidateType,
  type Dictionary,
  type DictionaryEntry,
  type Result,
} from '@privacy-bridge/core';
import { detectCsvDialect, parseCsv } from '../../document-formats/src/csv/adapter.js';

export const WIZARD_DICTIONARY_TYPES = [
  'PERSON',
  'ORGANIZATION',
  'DEPARTMENT',
  'PROJECT',
  'PRODUCT',
  'SYSTEM',
  'CUSTOM_TERM',
] as const satisfies readonly CandidateType[];

export type WizardDictionaryType = (typeof WIZARD_DICTIONARY_TYPES)[number];

const encoder = new TextEncoder();
const normalizedHeader = (value: string) => value.trim().toLowerCase().replace(/[ _-]/gu, '');

function validateNoConflictingForms(dictionary: Dictionary): Result<Dictionary> {
  const exactForms = new Map<string, string>();
  const foldedForms = new Map<string, Set<string>>();
  const insensitiveForms = new Map<string, string>();
  for (const entry of dictionary.entries) {
    const owner = JSON.stringify([entry.type, entry.term.normalize('NFC')]);
    for (const form of [entry.term, ...(entry.aliases ?? [])]) {
      const exact = form.normalize('NFC');
      const folded = exact.toLocaleLowerCase('und');
      const exactOwner = exactForms.get(exact);
      const insensitiveOwner = insensitiveForms.get(folded);
      const foldedOwners = foldedForms.get(folded) ?? new Set<string>();
      if (
        (exactOwner && exactOwner !== owner) ||
        (entry.caseSensitive && insensitiveOwner && insensitiveOwner !== owner) ||
        (!entry.caseSensitive && [...foldedOwners].some((existing) => existing !== owner))
      )
        return err(error('PB-DICT-CONFLICT'));
      exactForms.set(exact, owner);
      foldedOwners.add(owner);
      foldedForms.set(folded, foldedOwners);
      if (!entry.caseSensitive) insensitiveForms.set(folded, owner);
    }
  }
  return ok(dictionary);
}

function validateDictionary(dictionary: Dictionary): Result<Dictionary> {
  const parsed = validateDictionaryImport(encoder.encode(JSON.stringify(dictionary)));
  return parsed.ok ? validateNoConflictingForms(parsed.value) : parsed;
}

export function validateImportedDictionaryBytes(bytes: Uint8Array): Result<Dictionary> {
  const parsed = validateDictionaryImport(bytes);
  return parsed.ok ? validateNoConflictingForms(parsed.value) : parsed;
}

export function dictionaryFromLines(value: string, type: WizardDictionaryType): Result<Dictionary> {
  const terms = value
    .split(/\r?\n/u)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) return err(error('PB-SCHEMA-001'));
  const unique = [...new Set(terms.map((term) => term.normalize('NFC')))];
  return validateDictionary({
    entries: unique.map((term) => ({ term, type, handling: 'TOKENIZE' })),
  });
}

export function dictionaryFromCsv(bytes: Uint8Array): Result<Dictionary> {
  if (bytes.byteLength > DICTIONARY_LIMITS.bytes) return err(error('PB-SEC-004'));
  try {
    const buffer = Buffer.from(bytes);
    const detected = detectCsvDialect(buffer);
    if (detected.status !== 'DETECTED') return err(error('PB-SCHEMA-001'));
    const rows = parseCsv(buffer, detected.dialect).rows;
    const header = rows[0]?.map((field) => normalizedHeader(field.value)) ?? [];
    const termIndex = header.indexOf('term');
    const typeIndex = header.indexOf('type');
    const aliasesIndex = header.indexOf('aliases');
    const caseIndex = header.indexOf('casesensitive');
    if (termIndex < 0 || typeIndex < 0) return err(error('PB-SCHEMA-001'));
    const entries: DictionaryEntry[] = [];
    for (const row of rows.slice(1)) {
      const term = row[termIndex]?.value.trim() ?? '';
      const type = row[typeIndex]?.value.trim().toUpperCase() as CandidateType;
      if (!term && row.every((field) => !field.value.trim())) continue;
      if (!term || !WIZARD_DICTIONARY_TYPES.includes(type as WizardDictionaryType))
        return err(error('PB-SCHEMA-001'));
      const aliases =
        aliasesIndex < 0
          ? []
          : (row[aliasesIndex]?.value ?? '')
              .split('|')
              .map((alias) => alias.trim())
              .filter(Boolean);
      const caseValue = caseIndex < 0 ? '' : (row[caseIndex]?.value ?? '').trim().toLowerCase();
      if (caseValue && !['true', 'false'].includes(caseValue)) return err(error('PB-SCHEMA-001'));
      entries.push({
        term,
        type,
        ...(aliases.length ? { aliases } : {}),
        ...(caseValue ? { caseSensitive: caseValue === 'true' } : {}),
        handling: 'TOKENIZE',
      });
    }
    return validateDictionary({ entries });
  } catch {
    return err(error('PB-SCHEMA-001'));
  }
}

export function dictionaryPreviewWarnings(dictionary: Dictionary): readonly string[] {
  const short = dictionary.entries.filter((entry) => [...entry.term].length < 2).length;
  const aliasCount = dictionary.entries.reduce(
    (sum, entry) => sum + (entry.aliases?.length ?? 0),
    0,
  );
  return [
    ...(short ? [`有 ${short} 筆只有一個字，容易造成誤判，請特別確認。`] : []),
    ...(aliasCount ? [`包含 ${aliasCount} 個 Alias，會和主要名稱對應為同一類型。`] : []),
  ];
}
