import Ajv2020Import from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdf,
  randomBytes,
  scrypt,
} from 'node:crypto';
import { schemaCatalog } from './schema-catalog.js';
export {
  createInventory,
  createNodeSourceAdapter,
  type FileInventory,
  type SourceAdapter,
} from './inventory.js';
export { detectAll, type DetectedCandidate, type CandidateType } from './detection.js';
export { DICTIONARY_LIMITS, matchDictionary, mergeDictionaries, validateDictionaryImport, type Dictionary, type DictionaryEntry } from './resolution.js';

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
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  const length = Math.ceil((bytes.length * 8) / 5);
  let output = '';
  for (let index = length - 1; index >= 0; index -= 1)
    output += CROCKFORD[Number((value >> BigInt(index * 5)) & 31n)];
  return output;
}
export function decodeCrockfordBase32(input: string): Uint8Array {
  if (!/^[0-9A-HJKMNP-TV-Z]+$/.test(input)) throw new TypeError('invalid Crockford Base32');
  let value = 0n;
  for (const char of input) value = (value << 5n) | BigInt(CROCKFORD.indexOf(char));
  const bytes = new Uint8Array(Math.floor((input.length * 5) / 8));
  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    bytes[index] = Number(value & 255n);
    value >>= 8n;
  }
  return bytes;
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

const text = new TextEncoder();
export function validatePassphrase(passphrase: string): Result<string> {
  const count = [...passphrase].length;
  return count >= 12 && count <= 256 ? ok(passphrase) : err(error('PB-CRYPTO-003'));
}
export async function deriveScryptKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  if (!validatePassphrase(passphrase).ok || salt.length !== 16)
    throw new TypeError('invalid passphrase or salt');
  return new Uint8Array(
    await new Promise<Buffer>((resolve, reject) =>
      scrypt(
        Buffer.from(passphrase, 'utf8'),
        Buffer.from(salt),
        32,
        { N: 131072, r: 8, p: 1, maxmem: 268435456 },
        (cause, derived) => (cause ? reject(cause) : resolve(derived)),
      ),
    ),
  );
}
export async function deriveJobKey(
  rootKey: Uint8Array,
  clientId: string,
  jobId: string,
  info: string,
): Promise<Uint8Array> {
  const salt = createHashBytes(`PrivacyBridge|1|${clientId}|${jobId}`);
  return new Uint8Array(
    await new Promise<ArrayBuffer>((resolve, reject) =>
      hkdf('sha256', Buffer.from(rootKey), salt, text.encode(info), 32, (cause, derived) =>
        cause ? reject(cause) : resolve(derived),
      ),
    ),
  );
}
function createHashBytes(input: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(input, 'utf8').digest());
}
export interface AesGcmEnvelope {
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly authTag: Uint8Array;
}
export function aesGcmEncrypt(
  key: Uint8Array<ArrayBufferLike>,
  plaintext: Uint8Array<ArrayBufferLike>,
  aad: Uint8Array<ArrayBufferLike>,
  iv: Uint8Array<ArrayBufferLike> = randomBytes(12),
): AesGcmEnvelope {
  if (key.length !== 32 || iv.length !== 12) throw new TypeError('invalid AES-256-GCM key or IV');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  return {
    iv: new Uint8Array(iv),
    ciphertext: new Uint8Array(Buffer.concat([cipher.update(plaintext), cipher.final()])),
    authTag: new Uint8Array(cipher.getAuthTag()),
  };
}
export function aesGcmDecrypt(
  key: Uint8Array<ArrayBufferLike>,
  envelope: AesGcmEnvelope,
  aad: Uint8Array<ArrayBufferLike>,
): Uint8Array {
  const decipher = createDecipheriv('aes-256-gcm', key, envelope.iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(envelope.authTag);
  return new Uint8Array(Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]));
}
export const encodeBase64Url = (value: Uint8Array): string =>
  Buffer.from(value).toString('base64url');
export function tokenFor(
  tokenKey: Uint8Array,
  jobId: string,
  type: string,
  entityId: string,
): string {
  if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(type) || !/^[0-9A-HJKMNP-TV-Z]{16}$/.test(entityId))
    throw new TypeError('invalid token fields');
  const tag = encodeCrockfordBase32(
    new Uint8Array(
      createHmac('sha256', tokenKey)
        .update(`PB|1|${jobId}|${type}|${entityId}`, 'utf8')
        .digest()
        .subarray(0, 12),
    ),
  );
  return `⟦PB:${type}:${entityId}:${tag}⟧`;
}
