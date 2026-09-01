import { randomBytes, randomUUID } from 'node:crypto';
import { chmod, link, lstat, mkdir, open, readFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  canonicalStringify,
  deriveScryptKey,
  encodeBase64Url,
  err,
  error,
  ok,
  validatePassphrase,
  verifyToken,
  type Result,
} from './index.js';

const FORMAT = 'HSDJOB1';
const VERSION = '1.0.0';
const FILE_NAME = 'mapping.hsdjob';
const FILE_LIMIT = 25 * 1024 * 1024;
const JOB_LIMIT = 10_000;
const JOB_ID = /^PB-[0-9]{8}-[0-9A-HJKMNP-TV-Z]{10}$/u;
const TOKEN_TYPE = /^[A-Z][A-Z0-9_]{1,31}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export interface SafeJobEntity {
  readonly token: string;
  readonly type: string;
  readonly preferredDisplay: string;
}

export interface SafeJobRecord {
  readonly jobId: string;
  readonly createdAt: string;
  readonly sourceSha256: string;
  readonly packageHash: string;
  readonly documentIds: readonly string[];
  readonly tokenKey: Uint8Array;
  readonly entities: readonly SafeJobEntity[];
}

export interface SafeJobSummary {
  readonly jobId: string;
  readonly createdAt: string;
}

export interface SaveSafeJobRecordInput {
  readonly secureRoot: string;
  readonly jobId: string;
  readonly createdAt?: string;
  readonly sourceSha256: string;
  readonly packageHash: string;
  readonly documentIds: readonly string[];
  readonly tokenKey: Uint8Array;
  readonly entities: readonly SafeJobEntity[];
  readonly passphrase: string;
}

interface SafeJobEnvelope {
  readonly format: typeof FORMAT;
  readonly version: typeof VERSION;
  readonly jobId: string;
  readonly createdAt: string;
  readonly kdf: {
    readonly name: 'scrypt';
    readonly salt: string;
  };
  readonly cipher: {
    readonly algorithm: 'AES-256-GCM';
    readonly iv: string;
    readonly ciphertext: string;
    readonly authTag: string;
  };
}

interface SafeJobPayload {
  readonly sourceSha256: string;
  readonly packageHash: string;
  readonly documentIds: readonly string[];
  readonly tokenKey: string;
  readonly entities: readonly SafeJobEntity[];
}

function validTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new TypeError('invalid base64url');
  const decoded = new Uint8Array(Buffer.from(value, 'base64url'));
  if (encodeBase64Url(decoded) !== value) throw new TypeError('non-canonical base64url');
  return decoded;
}

function aad(jobId: string, createdAt: string): Uint8Array {
  return textEncoder.encode(`${FORMAT}|${VERSION}|${jobId}|${createdAt}`);
}

function validEntityShape(entity: SafeJobEntity): boolean {
  const displayLength = [...entity.preferredDisplay].length;
  return (
    typeof entity.token === 'string' &&
    typeof entity.type === 'string' &&
    TOKEN_TYPE.test(entity.type) &&
    typeof entity.preferredDisplay === 'string' &&
    displayLength > 0 &&
    displayLength <= 10_000
  );
}

function validateRecord(record: SafeJobRecord): boolean {
  if (
    !JOB_ID.test(record.jobId) ||
    !validTimestamp(record.createdAt) ||
    !SHA256.test(record.sourceSha256) ||
    !SHA256.test(record.packageHash) ||
    record.documentIds.length === 0 ||
    record.documentIds.length > 1_000 ||
    new Set(record.documentIds).size !== record.documentIds.length ||
    record.documentIds.some(
      (id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(id),
    ) ||
    record.tokenKey.length !== 32 ||
    record.entities.length > 50_000 ||
    record.entities.some((entity) => !validEntityShape(entity))
  )
    return false;
  const tokens = new Set<string>();
  for (const entity of record.entities) {
    if (tokens.has(entity.token)) return false;
    tokens.add(entity.token);
    const verified = verifyToken(entity.token, record.tokenKey, record.jobId);
    if (!verified.ok || verified.value.type !== entity.type) return false;
  }
  return true;
}

function parseEnvelope(bytes: Uint8Array): SafeJobEnvelope {
  if (bytes.byteLength > FILE_LIMIT) throw new TypeError('job record too large');
  const value: unknown = JSON.parse(textDecoder.decode(bytes));
  if (!value || typeof value !== 'object') throw new TypeError('invalid job envelope');
  const envelope = value as Partial<SafeJobEnvelope>;
  if (
    envelope.format !== FORMAT ||
    envelope.version !== VERSION ||
    typeof envelope.jobId !== 'string' ||
    !JOB_ID.test(envelope.jobId) ||
    typeof envelope.createdAt !== 'string' ||
    !validTimestamp(envelope.createdAt) ||
    !envelope.kdf ||
    envelope.kdf.name !== 'scrypt' ||
    typeof envelope.kdf.salt !== 'string' ||
    !envelope.cipher ||
    envelope.cipher.algorithm !== 'AES-256-GCM' ||
    typeof envelope.cipher.iv !== 'string' ||
    typeof envelope.cipher.ciphertext !== 'string' ||
    typeof envelope.cipher.authTag !== 'string'
  )
    throw new TypeError('invalid job envelope');
  return envelope as SafeJobEnvelope;
}

function recordPath(secureRoot: string, jobId: string): string {
  if (!secureRoot || !JOB_ID.test(jobId)) throw new TypeError('invalid job path');
  return join(secureRoot, 'jobs', jobId, FILE_NAME);
}

export async function saveSafeJobRecord(
  input: SaveSafeJobRecordInput,
): Promise<Result<SafeJobSummary>> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  if (!validatePassphrase(input.passphrase).ok) return err(error('PB-CRYPTO-003'));
  const record: SafeJobRecord = {
    jobId: input.jobId,
    createdAt,
    sourceSha256: input.sourceSha256,
    packageHash: input.packageHash,
    documentIds: [...input.documentIds],
    tokenKey: new Uint8Array(input.tokenKey),
    entities: input.entities.map((entity) => ({ ...entity })),
  };
  if (!validateRecord(record)) return err(error('PB-STORE-003'));

  const salt = randomBytes(16);
  let derived: Uint8Array | undefined;
  let plaintext: Uint8Array | undefined;
  let temporaryPath: string | undefined;
  try {
    derived = await deriveScryptKey(input.passphrase, salt);
    const payload: SafeJobPayload = {
      sourceSha256: record.sourceSha256,
      packageHash: record.packageHash,
      documentIds: record.documentIds,
      tokenKey: encodeBase64Url(record.tokenKey),
      entities: record.entities,
    };
    plaintext = textEncoder.encode(canonicalStringify(payload));
    const encrypted = aesGcmEncrypt(derived, plaintext, aad(record.jobId, record.createdAt));
    const envelope: SafeJobEnvelope = {
      format: FORMAT,
      version: VERSION,
      jobId: record.jobId,
      createdAt: record.createdAt,
      kdf: { name: 'scrypt', salt: encodeBase64Url(salt) },
      cipher: {
        algorithm: 'AES-256-GCM',
        iv: encodeBase64Url(encrypted.iv),
        ciphertext: encodeBase64Url(encrypted.ciphertext),
        authTag: encodeBase64Url(encrypted.authTag),
      },
    };
    const jobsRoot = join(input.secureRoot, 'jobs');
    const jobRoot = join(jobsRoot, record.jobId);
    await mkdir(jobRoot, { recursive: true, mode: 0o700 });
    await Promise.all([
      chmod(input.secureRoot, 0o700),
      chmod(jobsRoot, 0o700),
      chmod(jobRoot, 0o700),
    ]);
    temporaryPath = join(jobRoot, `.${FILE_NAME}.${randomUUID()}.tmp`);
    const handle = await open(temporaryPath, 'wx', 0o600);
    try {
      await handle.writeFile(`${canonicalStringify(envelope)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await link(temporaryPath, recordPath(input.secureRoot, record.jobId));
    await unlink(temporaryPath);
    temporaryPath = undefined;
    return ok({ jobId: record.jobId, createdAt: record.createdAt });
  } catch {
    if (temporaryPath) await unlink(temporaryPath).catch(() => undefined);
    return err(error('PB-STORE-003'));
  } finally {
    derived?.fill(0);
    plaintext?.fill(0);
    record.tokenKey.fill(0);
    salt.fill(0);
  }
}

export async function loadSafeJobRecord(
  secureRoot: string,
  jobId: string,
  passphrase: string,
): Promise<Result<SafeJobRecord>> {
  if (!validatePassphrase(passphrase).ok) return err(error('PB-CRYPTO-003'));
  let derived: Uint8Array | undefined;
  let plaintext: Uint8Array | undefined;
  try {
    const path = recordPath(secureRoot, jobId);
    const file = await lstat(path);
    if (!file.isFile() || file.isSymbolicLink() || file.size > FILE_LIMIT)
      return err(error('PB-STORE-003'));
    const envelope = parseEnvelope(await readFile(path));
    if (envelope.jobId !== jobId) return err(error('PB-STORE-003'));
    const salt = decodeBase64Url(envelope.kdf.salt);
    if (salt.length !== 16) return err(error('PB-STORE-003'));
    derived = await deriveScryptKey(passphrase, salt);
    plaintext = aesGcmDecrypt(
      derived,
      {
        iv: decodeBase64Url(envelope.cipher.iv),
        ciphertext: decodeBase64Url(envelope.cipher.ciphertext),
        authTag: decodeBase64Url(envelope.cipher.authTag),
      },
      aad(envelope.jobId, envelope.createdAt),
    );
    const payload: unknown = JSON.parse(textDecoder.decode(plaintext));
    if (!payload || typeof payload !== 'object') return err(error('PB-STORE-003'));
    const value = payload as Partial<SafeJobPayload>;
    if (
      typeof value.sourceSha256 !== 'string' ||
      typeof value.packageHash !== 'string' ||
      !Array.isArray(value.documentIds) ||
      value.documentIds.some((id) => typeof id !== 'string') ||
      typeof value.tokenKey !== 'string' ||
      !Array.isArray(value.entities)
    )
      return err(error('PB-STORE-003'));
    const record: SafeJobRecord = {
      jobId: envelope.jobId,
      createdAt: envelope.createdAt,
      sourceSha256: value.sourceSha256,
      packageHash: value.packageHash,
      documentIds: value.documentIds as readonly string[],
      tokenKey: decodeBase64Url(value.tokenKey),
      entities: value.entities as readonly SafeJobEntity[],
    };
    return validateRecord(record) ? ok(record) : err(error('PB-STORE-003'));
  } catch {
    return err(error('PB-CRYPTO-002'));
  } finally {
    derived?.fill(0);
    plaintext?.fill(0);
  }
}

export async function listSafeJobRecords(
  secureRoot: string,
): Promise<Result<readonly SafeJobSummary[]>> {
  try {
    const jobsRoot = join(secureRoot, 'jobs');
    const entries = await readdir(jobsRoot, { withFileTypes: true }).catch((cause: unknown) => {
      if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw cause;
    });
    if (entries.length > JOB_LIMIT) return err(error('PB-STORE-003'));
    const summaries: SafeJobSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || !JOB_ID.test(entry.name)) continue;
      const path = recordPath(secureRoot, entry.name);
      const file = await lstat(path).catch(() => undefined);
      if (!file?.isFile() || file.isSymbolicLink() || file.size > FILE_LIMIT) continue;
      const envelope = parseEnvelope(await readFile(path));
      if (envelope.jobId !== entry.name) continue;
      summaries.push({ jobId: envelope.jobId, createdAt: envelope.createdAt });
    }
    return ok(summaries.sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
  } catch {
    return err(error('PB-STORE-003'));
  }
}
