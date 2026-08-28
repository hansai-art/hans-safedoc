import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  canonicalStringify,
  encodeBase64Url,
  err,
  error,
  ok,
  parseDictionaryRecord,
  parseEncryptedEnvelope,
  type DictionaryRecord,
  type Result,
} from './index.js';

const CONTENT_SCHEMA = 'https://privacy-bridge.local/schemas/dictionary.schema.json';
const RECORD_TYPE = 'CLIENT_DICTIONARY';
const VERSION = '1.0.0';
const encoder = new TextEncoder();

export interface ClientDictionaryContext {
  readonly storeId: string;
  readonly clientId: string;
  readonly keyId: string;
}
export interface SaveClientDictionaryInput {
  readonly storeRoot: string;
  readonly dictionary: unknown;
  readonly key: Uint8Array;
  readonly context: ClientDictionaryContext;
  readonly createdAt?: string;
}
interface Envelope {
  envelopeVersion: 'PBENC1';
  contentSchema: string;
  contentVersion: string;
  keyId: string;
  recordType: string;
  cipher: {
    algorithm: 'AES-256-GCM';
    iv: string;
    ciphertext: string;
    authTag: string;
  };
  aad: {
    storeId: string;
    clientId: string;
    jobId: null;
    recordType: string;
    canonical: string;
  };
  createdAt: string;
}

function canonicalAad(context: ClientDictionaryContext): string {
  return [
    'PBENC1',
    context.storeId,
    context.clientId,
    '',
    CONTENT_SCHEMA,
    VERSION,
    RECORD_TYPE,
  ].join('\0');
}
function dictionaryMatchesContext(dictionary: DictionaryRecord, context: ClientDictionaryContext) {
  return (
    dictionary.clientId === context.clientId &&
    dictionary.jobId === null &&
    dictionary.scope === 'CLIENT'
  );
}
function decodeBase64Url(value: string): Uint8Array {
  const decoded = new Uint8Array(Buffer.from(value, 'base64url'));
  if (encodeBase64Url(decoded) !== value) throw new TypeError('non-canonical base64url');
  return decoded;
}

export function encryptClientDictionary(
  dictionary: unknown,
  key: Uint8Array,
  context: ClientDictionaryContext,
  createdAt = new Date().toISOString(),
): Result<Uint8Array> {
  const validated = parseDictionaryRecord(dictionary);
  if (!validated.ok || !dictionaryMatchesContext(validated.value, context))
    return err(error('PB-SCHEMA-001'));
  try {
    const canonical = canonicalAad(context);
    const encrypted = aesGcmEncrypt(
      key,
      encoder.encode(canonicalStringify(validated.value)),
      encoder.encode(canonical),
    );
    const envelope: Envelope = {
      envelopeVersion: 'PBENC1',
      contentSchema: CONTENT_SCHEMA,
      contentVersion: VERSION,
      keyId: context.keyId,
      recordType: RECORD_TYPE,
      cipher: {
        algorithm: 'AES-256-GCM',
        iv: encodeBase64Url(encrypted.iv),
        ciphertext: encodeBase64Url(encrypted.ciphertext),
        authTag: encodeBase64Url(encrypted.authTag),
      },
      aad: {
        storeId: context.storeId,
        clientId: context.clientId,
        jobId: null,
        recordType: RECORD_TYPE,
        canonical,
      },
      createdAt,
    };
    if (!parseEncryptedEnvelope(envelope).ok) return err(error('PB-SCHEMA-001'));
    return ok(encoder.encode(canonicalStringify(envelope)));
  } catch {
    return err(error('PB-CRYPTO-002'));
  }
}

export function decryptClientDictionary(
  bytes: Uint8Array,
  key: Uint8Array,
  context: ClientDictionaryContext,
): Result<DictionaryRecord> {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const validatedEnvelope = parseEncryptedEnvelope(parsed);
    if (!validatedEnvelope.ok) return err(error('PB-CRYPTO-002'));
    const envelope = validatedEnvelope.value as unknown as Envelope;
    const canonical = canonicalAad(context);
    if (
      envelope.contentSchema !== CONTENT_SCHEMA ||
      envelope.contentVersion !== VERSION ||
      envelope.keyId !== context.keyId ||
      envelope.recordType !== RECORD_TYPE ||
      envelope.aad.storeId !== context.storeId ||
      envelope.aad.clientId !== context.clientId ||
      envelope.aad.jobId !== null ||
      envelope.aad.recordType !== RECORD_TYPE ||
      envelope.aad.canonical !== canonical
    )
      return err(error('PB-CRYPTO-002'));
    const plaintext = aesGcmDecrypt(
      key,
      {
        iv: decodeBase64Url(envelope.cipher.iv),
        ciphertext: decodeBase64Url(envelope.cipher.ciphertext),
        authTag: decodeBase64Url(envelope.cipher.authTag),
      },
      encoder.encode(canonical),
    );
    const dictionary: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(plaintext),
    );
    const validatedDictionary = parseDictionaryRecord(dictionary);
    if (!validatedDictionary.ok || !dictionaryMatchesContext(validatedDictionary.value, context))
      return err(error('PB-CRYPTO-002'));
    return ok(validatedDictionary.value);
  } catch {
    return err(error('PB-CRYPTO-002'));
  }
}

export async function saveClientDictionary(
  input: SaveClientDictionaryInput,
): Promise<Result<string>> {
  const encrypted = encryptClientDictionary(
    input.dictionary,
    input.key,
    input.context,
    input.createdAt,
  );
  if (!encrypted.ok) return encrypted;
  const clientRoot = join(input.storeRoot, 'clients', input.context.clientId);
  const target = join(clientRoot, 'dictionary.enc');
  const temporary = join(clientRoot, `.dictionary.enc.${randomUUID()}.tmp`);
  try {
    await mkdir(clientRoot, { recursive: true, mode: 0o700 });
    await writeFile(temporary, encrypted.value, { flag: 'wx', mode: 0o600 });
    await rename(temporary, target);
    return ok(target);
  } catch {
    await rm(temporary, { force: true }).catch(() => undefined);
    return err(error('PB-STORE-003'));
  }
}

export async function loadClientDictionary(
  path: string,
  key: Uint8Array,
  context: ClientDictionaryContext,
): Promise<Result<DictionaryRecord>> {
  try {
    return decryptClientDictionary(new Uint8Array(await readFile(path)), key, context);
  } catch {
    return err(error('PB-STORE-003'));
  }
}
