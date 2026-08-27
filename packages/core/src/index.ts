import Ajv2020Import from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';
import { schemaCatalog } from './schema-catalog.js';

/** Pure, platform-independent Privacy Bridge core. */
export const CORE_PACKAGE_ID = 'privacy-bridge-core';
export const SCHEMA_VERSION = '1.0.0';

export type Result<T, E extends PBError = PBError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
export interface PBError {
  readonly code: string;
  readonly messageKey: string;
  readonly blocking: boolean;
  readonly safeContext: Readonly<Record<string, string | number | undefined>>;
}
export const error = (code: string, messageKey = code, blocking = true): PBError => ({
  code,
  messageKey,
  blocking,
  safeContext: {},
});
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = <T = never>(value: PBError): Result<T> => ({ ok: false, error: value });

export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type ClientId = Brand<string, 'ClientId'>;
export type JobId = Brand<string, 'JobId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type CandidateId = Brand<string, 'CandidateId'>;
export interface Clock {
  now(): Date;
}
export interface Random {
  bytes(length: number): Uint8Array;
  uuid(): string;
}
export interface CryptoProvider {
  sha256(input: Uint8Array): Promise<Uint8Array>;
}

const Ajv2020 = Ajv2020Import as unknown as new (options: {
  allErrors: boolean;
  strict: boolean;
}) => {
  addSchema(schema: unknown): void;
  getSchema(id: string): ((value: unknown) => boolean) | undefined;
};
const addFormats = addFormatsImport as unknown as (instance: unknown) => void;
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const schema of schemaCatalog) ajv.addSchema(schema);
type JsonRecord = Record<string, unknown>;
function parseSchema<T>(schemaFile: string, value: unknown): Result<T> {
  const validate = ajv.getSchema(`https://privacy-bridge.local/schemas/${schemaFile}`);
  if (!validate || !validate(value)) return err(error('PB-SCHEMA-001'));
  return ok(value as T);
}
export type Store = JsonRecord;
export type ClientProfile = JsonRecord;
export type Job = JsonRecord;
export type Candidate = JsonRecord;
export type ExportManifest = JsonRecord;
export type ResultPackage = JsonRecord;
export const parseStore = (v: unknown) => parseSchema<Store>('store.schema.json', v);
export const parseClientProfile = (v: unknown) =>
  parseSchema<ClientProfile>('client-profile.schema.json', v);
export const parseJob = (v: unknown) => parseSchema<Job>('job.schema.json', v);
export const parseCandidate = (v: unknown) => parseSchema<Candidate>('candidate.schema.json', v);
export const parseExportManifest = (v: unknown) =>
  parseSchema<ExportManifest>('export-manifest.schema.json', v);
export const parseResultPackage = (v: unknown) =>
  parseSchema<ResultPackage>('result-package.schema.json', v);

export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}
export function parseSemVer(value: string): Result<SemVer> {
  const match = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.exec(value);
  return match
    ? ok({ major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) })
    : err(error('PB-STORE-002'));
}
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value))
      throw new TypeError('canonical JSON only accepts finite integers');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as JsonRecord;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError('canonical JSON unsupported value');
}
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function encodeCrockfordBase32(bytes: Uint8Array): string {
  let bits = 0;
  let buffer = 0;
  let output = '';
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += CROCKFORD[(buffer >>> bits) & 31];
    }
  }
  return bits === 0 ? output : output + CROCKFORD[(buffer << (5 - bits)) & 31];
}
export function decodeCrockfordBase32(input: string): Uint8Array {
  if (!/^[0-9A-HJKMNP-TV-Z]+$/.test(input)) throw new TypeError('invalid Crockford Base32');
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const char of input) {
    const index = CROCKFORD.indexOf(char);
    buffer = (buffer << 5) | index;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 255);
    }
  }
  return new Uint8Array(bytes);
}
export interface TextSpan {
  readonly start: number;
  readonly end: number;
}
export function validateUtf16Span(text: string, span: TextSpan): Result<TextSpan> {
  const invalid =
    !Number.isInteger(span.start) ||
    !Number.isInteger(span.end) ||
    span.start < 0 ||
    span.end <= span.start ||
    span.end > text.length ||
    (span.start > 0 && /[\uDC00-\uDFFF]/.test(text[span.start] ?? '')) ||
    (span.end < text.length && /[\uDC00-\uDFFF]/.test(text[span.end] ?? ''));
  return invalid ? err(error('PB-SCAN-001')) : ok(span);
}
