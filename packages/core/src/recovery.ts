import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  deriveScryptKey,
  encodeBase64Url,
  err,
  error,
  ok,
  validatePassphrase,
  type Result,
} from './index.js';

export type JournalPhase =
  | 'PREPARED'
  | 'WRITING_TEMP'
  | 'TEMP_VALIDATED'
  | 'SWAP_PENDING'
  | 'SWAPPED'
  | 'POST_VALIDATION'
  | 'COMMITTED'
  | 'ROLLBACK_PENDING'
  | 'ROLLED_BACK'
  | 'FAILED';
export type RecoveryAction = 'ROLLBACK' | 'ROLL_FORWARD' | 'CLEANUP' | 'REQUIRE_WIZARD';

/** A stale lock is never inferred from time alone. */
export function isStaleLock(
  lock: { readonly heartbeatAt: string },
  now: Date,
  processAlive: boolean,
  sameDeviceOwned: boolean,
): boolean {
  const heartbeat = Date.parse(lock.heartbeatAt);
  return (
    Number.isFinite(heartbeat) &&
    now.getTime() - heartbeat > 60_000 &&
    !processAlive &&
    !sameDeviceOwned
  );
}
export function decideRecovery(
  phase: JournalPhase,
  fullyValidated: boolean,
  requested?: 'ROLL_FORWARD',
): RecoveryAction {
  if (phase === 'COMMITTED') return 'CLEANUP';
  if (phase === 'FAILED') return 'REQUIRE_WIZARD';
  return requested === 'ROLL_FORWARD' &&
    fullyValidated &&
    (phase === 'SWAPPED' || phase === 'POST_VALIDATION')
    ? 'ROLL_FORWARD'
    : 'ROLLBACK';
}
export interface MigrationResult {
  readonly active: ReadonlyMap<string, Uint8Array>;
  readonly recoverySnapshot: ReadonlyMap<string, Uint8Array>;
  readonly committed: true;
}
const clone = (source: ReadonlyMap<string, Uint8Array>) =>
  new Map([...source].map(([name, bytes]) => [name, new Uint8Array(bytes)]));
/** Adapter-level copy-on-write primitive: the original map is never mutated. */
export function copyOnWriteMigrate(
  current: ReadonlyMap<string, Uint8Array>,
  migrate: (staging: Map<string, Uint8Array>) => void,
): Result<MigrationResult> {
  const recoverySnapshot = clone(current),
    staging = clone(current);
  try {
    migrate(staging);
    if ([...staging].some(([name, bytes]) => !name || bytes.length === 0))
      return err(error('PB-MIG-001'));
    return ok({ active: staging, recoverySnapshot, committed: true });
  } catch {
    return err(error('PB-MIG-001'));
  }
}

/** A deliberately small, store-only ZIP codec for encrypted backup records. */
type ArchiveEntry = { readonly name: string; readonly bytes: Uint8Array };
const utf8 = new TextEncoder();
const text = new TextDecoder('utf-8', { fatal: true });
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const u16 = (value: number) => Uint8Array.of(value & 255, (value >>> 8) & 255);
const u32 = (value: number) =>
  Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
const read16 = (bytes: Uint8Array, at: number) => bytes[at]! | (bytes[at + 1]! << 8);
const read32 = (bytes: Uint8Array, at: number) =>
  (read16(bytes, at) | (read16(bytes, at + 2) << 16)) >>> 0;
const concat = (parts: readonly Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    result.set(part, at);
    at += part.length;
  }
  return result;
};
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipStore(entries: readonly ArchiveEntry[]): Uint8Array {
  const local: Uint8Array[] = [],
    central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = utf8.encode(entry.name),
      crc = crc32(entry.bytes);
    const body = concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(entry.bytes.length),
      u32(entry.bytes.length),
      u16(name.length),
      u16(0),
      name,
      entry.bytes,
    ]);
    local.push(body);
    central.push(
      concat([
        u32(0x02014b50),
        u16(0x0314),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(entry.bytes.length),
        u32(entry.bytes.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += body.length;
  }
  const directory = concat(central);
  return concat([
    ...local,
    directory,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(directory.length),
    u32(offset),
    u16(0),
  ]);
}
function safeBackupPath(name: string): boolean {
  return /^(?:backup-manifest\.json|job-root-key\.backup-envelope\.json|checksums\.json|job\/[a-z0-9][a-z0-9._-]{0,127}\.enc)$/.test(
    name,
  );
}
function readZip(bytes: Uint8Array): Result<readonly ArchiveEntry[]> {
  if (bytes.length < 22 || read32(bytes, bytes.length - 22) !== 0x06054b50)
    return err(error('PB-BACKUP-001'));
  const end = bytes.length - 22,
    count = read16(bytes, end + 10),
    directorySize = read32(bytes, end + 12),
    directoryOffset = read32(bytes, end + 16);
  if (count > 100 || directoryOffset + directorySize !== end) return err(error('PB-BACKUP-001'));
  const entries: ArchiveEntry[] = [];
  let at = directoryOffset;
  for (let index = 0; index < count; index += 1) {
    if (at + 46 > end || read32(bytes, at) !== 0x02014b50) return err(error('PB-BACKUP-001'));
    const flags = read16(bytes, at + 8),
      method = read16(bytes, at + 10),
      crc = read32(bytes, at + 16),
      size = read32(bytes, at + 24),
      nameLength = read16(bytes, at + 28),
      extraLength = read16(bytes, at + 30),
      commentLength = read16(bytes, at + 32),
      attrs = read32(bytes, at + 38),
      localOffset = read32(bytes, at + 42);
    if (
      flags !== 0x0800 ||
      method !== 0 ||
      ((attrs >>> 16) & 0o170000) === 0o120000 ||
      at + 46 + nameLength + extraLength + commentLength > end ||
      localOffset + 30 > directoryOffset
    )
      return err(error('PB-BACKUP-001'));
    let name: string;
    try {
      name = text.decode(bytes.slice(at + 46, at + 46 + nameLength));
    } catch {
      return err(error('PB-BACKUP-001'));
    }
    const localNameLength = read16(bytes, localOffset + 26),
      localExtraLength = read16(bytes, localOffset + 28),
      dataAt = localOffset + 30 + localNameLength + localExtraLength;
    if (
      !safeBackupPath(name) ||
      read16(bytes, localOffset + 6) !== flags ||
      read16(bytes, localOffset + 8) !== method ||
      read32(bytes, localOffset + 14) !== crc ||
      read32(bytes, localOffset + 18) !== size ||
      read32(bytes, localOffset + 22) !== size ||
      localNameLength !== nameLength ||
      text.decode(bytes.slice(localOffset + 30, localOffset + 30 + localNameLength)) !== name ||
      dataAt + size > directoryOffset ||
      crc !== crc32(bytes.slice(dataAt, dataAt + size))
    )
      return err(error('PB-BACKUP-001'));
    entries.push({ name, bytes: bytes.slice(dataAt, dataAt + size) });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return at === end && new Set(entries.map((entry) => entry.name)).size === entries.length
    ? ok(entries)
    : err(error('PB-BACKUP-001'));
}

export interface PbJobRecord {
  readonly relativePath: string;
  readonly bytes: Uint8Array;
}
export interface PbJobBackupInput {
  readonly jobId: string;
  readonly pluginVersion: string;
  readonly createdAt: string;
  readonly backupPassphrase: string;
  readonly backupPassphraseConfirmation: string;
  readonly jobRootKey: Uint8Array;
  readonly records: readonly PbJobRecord[];
}
export interface PbJobBackup {
  readonly bytes: Uint8Array;
  readonly packageHash: string;
}
export interface ImportedPbJob {
  readonly jobId: string;
  readonly jobRootKey: Uint8Array;
  readonly records: readonly PbJobRecord[];
}
const backupAad = (jobId: string) => utf8.encode(`PB|1|BACKUP_JOB_ROOT_KEY|${jobId}`);

/** Creates a self-validating `.pbjob`; caller publishes returned bytes atomically. */
export async function createPbJobBackup(input: PbJobBackupInput): Promise<Result<PbJobBackup>> {
  if (
    input.backupPassphrase !== input.backupPassphraseConfirmation ||
    !validatePassphrase(input.backupPassphrase).ok ||
    input.jobRootKey.length !== 32 ||
    !/^PB-\d{8}-[0-9A-HJKMNP-TV-Z]{10}$/.test(input.jobId) ||
    input.records.length === 0
  )
    return err(error('PB-BACKUP-001'));
  const names = new Set<string>();
  if (
    input.records.some(
      (record) =>
        !/^job\/[a-z0-9][a-z0-9._-]{0,127}\.enc$/.test(record.relativePath) ||
        names.has(record.relativePath) ||
        (names.add(record.relativePath), false),
    )
  )
    return err(error('PB-BACKUP-001'));
  const salt = randomBytes(16),
    kek = await deriveScryptKey(input.backupPassphrase, salt);
  try {
    const encrypted = aesGcmEncrypt(kek, input.jobRootKey, backupAad(input.jobId));
    const envelope = {
      schemaVersion: '1.0.0',
      envelopeVersion: 'PBKEY1',
      keyKind: 'BACKUP_JOB_ROOT_KEY',
      keyId: randomUUID(),
      ownerId: input.jobId,
      parentKeyId: null,
      kdf: {
        algorithm: 'scrypt',
        salt: encodeBase64Url(salt),
        N: 131072,
        r: 8,
        p: 1,
        dkLen: 32,
        maxmem: 268435456,
      },
      cipher: {
        algorithm: 'AES-256-GCM',
        iv: encodeBase64Url(encrypted.iv),
        ciphertext: encodeBase64Url(encrypted.ciphertext),
        authTag: encodeBase64Url(encrypted.authTag),
        aad: `PB|1|BACKUP_JOB_ROOT_KEY|${input.jobId}`,
      },
      createdAt: input.createdAt,
    };
    const files = input.records.map((record) => ({
      relativePath: record.relativePath,
      sha256: sha256(record.bytes),
      size: record.bytes.length,
    }));
    const base = {
      schemaVersion: '1.0.0',
      backupId: randomUUID(),
      jobId: input.jobId,
      pluginVersion: input.pluginVersion,
      createdAt: input.createdAt,
      jobSchemaVersion: '1.0.0',
      keyEnvelopeFile: 'job-root-key.backup-envelope.json',
      files,
      packageHash: '0'.repeat(64),
    };
    const entries: ArchiveEntry[] = [
      { name: 'backup-manifest.json', bytes: utf8.encode(JSON.stringify(base)) },
      { name: 'job-root-key.backup-envelope.json', bytes: utf8.encode(JSON.stringify(envelope)) },
      ...input.records.map((record) => ({ name: record.relativePath, bytes: record.bytes })),
    ];
    const checksums = Object.fromEntries(
      entries.slice(1).map((entry) => [entry.name, sha256(entry.bytes)]),
    );
    entries.push({ name: 'checksums.json', bytes: utf8.encode(JSON.stringify(checksums)) });
    const packageHash = sha256(zipStore(entries));
    entries[0] = {
      name: 'backup-manifest.json',
      bytes: utf8.encode(JSON.stringify({ ...base, packageHash })),
    };
    const bytes = zipStore(entries);
    const validation = await importPbJobBackup(bytes, input.backupPassphrase);
    if (!validation.ok) return err(error('PB-BACKUP-001'));
    return ok({ bytes, packageHash });
  } finally {
    kek.fill(0);
  }
}

/** Fully validates/decrypts before returning anything, so callers can stage then atomically commit. */
export async function importPbJobBackup(
  bytes: Uint8Array,
  passphrase: string,
): Promise<Result<ImportedPbJob>> {
  if (!validatePassphrase(passphrase).ok) return err(error('PB-BACKUP-001'));
  const parsed = readZip(bytes);
  if (!parsed.ok) return err(parsed.error);
  try {
    const byName = new Map(parsed.value.map((entry) => [entry.name, entry]));
    const manifest = JSON.parse(text.decode(byName.get('backup-manifest.json')!.bytes)) as {
      jobId?: string;
      packageHash?: string;
      files?: { relativePath: string; sha256: string; size: number }[];
    };
    const envelope = JSON.parse(
      text.decode(byName.get('job-root-key.backup-envelope.json')!.bytes),
    ) as {
      kdf?: { salt?: string };
      cipher?: { iv?: string; ciphertext?: string; authTag?: string; aad?: string };
    };
    const checksums = JSON.parse(text.decode(byName.get('checksums.json')!.bytes)) as Record<
      string,
      string
    >;
    if (
      !manifest.jobId ||
      !manifest.files ||
      !envelope.kdf?.salt ||
      !envelope.cipher?.iv ||
      !envelope.cipher.ciphertext ||
      !envelope.cipher.authTag ||
      envelope.cipher.aad !== `PB|1|BACKUP_JOB_ROOT_KEY|${manifest.jobId}` ||
      !manifest.packageHash
    )
      return err(error('PB-BACKUP-001'));
    const zeroed = parsed.value.map((entry) =>
      entry.name !== 'backup-manifest.json'
        ? entry
        : {
            ...entry,
            bytes: utf8.encode(JSON.stringify({ ...manifest, packageHash: '0'.repeat(64) })),
          },
    );
    if (sha256(zipStore(zeroed)) !== manifest.packageHash) return err(error('PB-BACKUP-001'));
    const records: PbJobRecord[] = [];
    for (const file of manifest.files) {
      const entry = byName.get(file.relativePath);
      if (
        !entry ||
        checksums[file.relativePath] !== sha256(entry.bytes) ||
        sha256(entry.bytes) !== file.sha256 ||
        entry.bytes.length !== file.size
      )
        return err(error('PB-BACKUP-001'));
      records.push({ relativePath: file.relativePath, bytes: new Uint8Array(entry.bytes) });
    }
    const salt = Buffer.from(envelope.kdf.salt, 'base64url'),
      kek = await deriveScryptKey(passphrase, salt);
    try {
      const key = aesGcmDecrypt(
        kek,
        {
          iv: Buffer.from(envelope.cipher.iv, 'base64url'),
          ciphertext: Buffer.from(envelope.cipher.ciphertext, 'base64url'),
          authTag: Buffer.from(envelope.cipher.authTag, 'base64url'),
        },
        backupAad(manifest.jobId),
      );
      return key.length === 32
        ? ok({ jobId: manifest.jobId, jobRootKey: key, records })
        : err(error('PB-BACKUP-001'));
    } finally {
      kek.fill(0);
    }
  } catch {
    return err(error('PB-BACKUP-001'));
  }
}
