import { createHash } from 'node:crypto';
import { canonicalStringify, err, error, ok, parseExportManifest, type Result } from './index.js';

/** v1 deliberately does not split packages: a larger export must be refused. */
export const SAFE_PACKAGE_LIMIT = 2 * 1024 * 1024 * 1024;
const text = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const ZERO_HASH = '0'.repeat(64);
const FIXED_ENTRIES = new Set([
  'manifest.json',
  'schema.json',
  'entity-index.json',
  'checksums.json',
]);

export interface SafePackageDocument {
  readonly documentId: string;
  /** Sanitized Shadow-relative path only. Raw source paths are never accepted. */
  readonly relativePath: string;
  readonly content: string | Uint8Array;
}
export interface SafePackageEntity {
  readonly token: string;
  readonly type: string;
  readonly documentIds: readonly string[];
}
export interface SafePackageInput {
  readonly jobId: string;
  readonly pluginVersion: string;
  readonly rulesVersion: string;
  readonly sourceSnapshotHash: string;
  readonly createdAt: string;
  readonly documents: readonly SafePackageDocument[];
  readonly entities: readonly SafePackageEntity[];
  readonly estimatedBytes?: number;
}
export interface SafePackage {
  readonly bytes: Uint8Array;
  readonly packageHash: string;
  readonly manifest: Record<string, unknown>;
}
type ZipEntry = {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly externalAttributes?: number;
};
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export function normalizeSafeEntryPath(value: string): Result<string> {
  if (
    !value ||
    value.length > 4096 ||
    value.includes('\\') ||
    value.startsWith('/') ||
    /^[A-Za-z]:/.test(value) ||
    value.includes('\0') ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  )
    return err(error('PB-EXPORT-005'));
  return ok(value.normalize('NFC'));
}
function allowedName(name: string): boolean {
  return (
    FIXED_ENTRIES.has(name) ||
    /^notes\/[a-z0-9][a-z0-9._-]{0,255}\.txt$/u.test(name) ||
    /^documents\/[a-z0-9][a-z0-9._-]{0,255}\.(md|txt)$/u.test(name)
  );
}
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const u16 = (v: number): Uint8Array => Uint8Array.of(v & 255, (v >>> 8) & 255);
const u32 = (v: number): Uint8Array =>
  Uint8Array.of(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
const read16 = (b: Uint8Array, i: number): number => b[i]! | (b[i + 1]! << 8);
const read32 = (b: Uint8Array, i: number): number =>
  (read16(b, i) | (read16(b, i + 2) << 16)) >>> 0;
const join = (parts: readonly Uint8Array[]): Uint8Array => {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};
function zipStore(entries: readonly ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [],
    central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = text.encode(entry.name),
      crc = crc32(entry.bytes);
    const local = join([
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
    locals.push(local);
    central.push(
      join([
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
        u32(entry.externalAttributes ?? 0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const directory = join(central);
  return join([
    ...locals,
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
function readZip(bytes: Uint8Array): Result<readonly ZipEntry[]> {
  if (bytes.length < 22 || read32(bytes, bytes.length - 22) !== 0x06054b50)
    return err(error('PB-EXPORT-005'));
  const end = bytes.length - 22,
    count = read16(bytes, end + 10),
    directorySize = read32(bytes, end + 12),
    directoryOffset = read32(bytes, end + 16);
  if (count > 100000 || directoryOffset + directorySize !== end) return err(error('PB-EXPORT-005'));
  const entries: ZipEntry[] = [];
  let at = directoryOffset;
  for (let i = 0; i < count; i += 1) {
    if (at + 46 > end || read32(bytes, at) !== 0x02014b50) return err(error('PB-EXPORT-005'));
    const flags = read16(bytes, at + 8),
      method = read16(bytes, at + 10),
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
      at + 46 + nameLength + extraLength + commentLength > end
    )
      return err(error('PB-EXPORT-005'));
    let name: string;
    try {
      name = decoder.decode(bytes.slice(at + 46, at + 46 + nameLength));
    } catch {
      return err(error('PB-EXPORT-005'));
    }
    const safe = normalizeSafeEntryPath(name);
    if (
      !safe.ok ||
      !allowedName(safe.value) ||
      localOffset + 30 > bytes.length ||
      read32(bytes, localOffset) !== 0x04034b50
    )
      return err(error('PB-EXPORT-005'));
    const localNameLength = read16(bytes, localOffset + 26),
      localExtraLength = read16(bytes, localOffset + 28),
      dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (
      dataOffset + size > directoryOffset ||
      read32(bytes, at + 16) !== crc32(bytes.slice(dataOffset, dataOffset + size))
    )
      return err(error('PB-EXPORT-005'));
    entries.push({
      name: safe.value,
      bytes: bytes.slice(dataOffset, dataOffset + size),
      externalAttributes: attrs,
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return at === end ? ok(entries) : err(error('PB-EXPORT-005'));
}
function packageDigest(entries: readonly ZipEntry[]): string {
  return sha256(
    zipStore(
      entries.map((entry) =>
        entry.name === 'manifest.json'
          ? {
              ...entry,
              bytes: text.encode(
                canonicalStringify({
                  ...(JSON.parse(decoder.decode(entry.bytes)) as Record<string, unknown>),
                  packageHash: ZERO_HASH,
                }),
              ),
            }
          : entry,
      ),
    ),
  );
}
export function buildSafePackage(input: SafePackageInput): Result<SafePackage> {
  if (
    !Number.isSafeInteger(input.estimatedBytes ?? 0) ||
    (input.estimatedBytes ?? 0) > SAFE_PACKAGE_LIMIT
  )
    return err(error('PB-EXPORT-005'));
  const documentIds = new Set<string>(),
    names = new Set<string>();
  const docs: ZipEntry[] = [];
  for (const document of input.documents) {
    const name = normalizeSafeEntryPath(document.relativePath);
    if (
      !name.ok ||
      !allowedName(name.value) ||
      !name.value.startsWith('documents/') ||
      documentIds.has(document.documentId) ||
      names.has(name.value)
    )
      return err(error('PB-EXPORT-005'));
    documentIds.add(document.documentId);
    names.add(name.value);
    docs.push({
      name: name.value,
      bytes:
        typeof document.content === 'string' ? text.encode(document.content) : document.content,
    });
  }
  const total = docs.reduce((sum, entry) => sum + entry.bytes.length, 0);
  if (total > SAFE_PACKAGE_LIMIT) return err(error('PB-EXPORT-005'));
  const entityIndex = input.entities.map(({ token, type, documentIds: ids }) => ({
    token,
    type,
    documentIds: [...ids],
  }));
  if (entityIndex.some((entity) => entity.documentIds.some((id) => !documentIds.has(id))))
    return err(error('PB-EXPORT-005'));
  const files = input.documents.map((document, i) => ({
    documentId: document.documentId,
    relativePath: docs[i]!.name,
    sha256: sha256(docs[i]!.bytes),
    size: docs[i]!.bytes.length,
  }));
  const tokenTypeCounts: Record<string, number> = {};
  for (const entity of entityIndex)
    tokenTypeCounts[entity.type] = (tokenTypeCounts[entity.type] ?? 0) + 1;
  const baseManifest: Record<string, unknown> = {
    schemaVersion: '1.0.0',
    jobId: input.jobId,
    pluginVersion: input.pluginVersion,
    rulesVersion: input.rulesVersion,
    createdAt: input.createdAt,
    sourceSnapshotHash: input.sourceSnapshotHash,
    packageHash: ZERO_HASH,
    fileCount: files.length,
    tokenCount: entityIndex.length,
    files,
    tokenTypeCounts,
    exclusions: { unsupported: 0, system: 0, user: 0 },
  };
  if (!parseExportManifest(baseManifest).ok) return err(error('PB-EXPORT-005'));
  const schema = JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Privacy Bridge Safe Package',
    version: '1.0.0',
  });
  const contentEntries: ZipEntry[] = [
    ...docs,
    { name: 'entity-index.json', bytes: text.encode(canonicalStringify(entityIndex)) },
    { name: 'schema.json', bytes: text.encode(schema) },
  ];
  const checksums = Object.fromEntries(
    contentEntries.map((entry) => [entry.name, sha256(entry.bytes)]),
  );
  const provisional: ZipEntry[] = [
    { name: 'manifest.json', bytes: text.encode(canonicalStringify(baseManifest)) },
    ...contentEntries,
    { name: 'checksums.json', bytes: text.encode(canonicalStringify(checksums)) },
  ];
  const packageHash = packageDigest(provisional);
  const manifest = { ...baseManifest, packageHash };
  const bytes = zipStore([
    { name: 'manifest.json', bytes: text.encode(canonicalStringify(manifest)) },
    ...contentEntries,
    { name: 'checksums.json', bytes: text.encode(canonicalStringify(checksums)) },
  ]);
  if (bytes.length > SAFE_PACKAGE_LIMIT || !validateSafePackage(bytes).ok)
    return err(error('PB-EXPORT-005'));
  return ok({ bytes, packageHash, manifest });
}
function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

export function validateSafePackage(bytes: Uint8Array): Result<true> {
  if (bytes.length > SAFE_PACKAGE_LIMIT) return err(error('PB-EXPORT-005'));
  const parsed = readZip(bytes);
  if (!parsed.ok) return err(parsed.error);
  const byName = new Map(parsed.value.map((entry) => [entry.name, entry]));
  if (byName.size !== parsed.value.length || [...FIXED_ENTRIES].some((name) => !byName.has(name)))
    return err(error('PB-EXPORT-005'));
  try {
    const manifestEntry = byName.get('manifest.json');
    const checksumsEntry = byName.get('checksums.json');
    if (!manifestEntry || !checksumsEntry) return err(error('PB-EXPORT-005'));
    const manifestJson: unknown = JSON.parse(decoder.decode(manifestEntry.bytes));
    const manifest = parseExportManifest(manifestJson);
    const checksums: unknown = JSON.parse(decoder.decode(checksumsEntry.bytes));
    if (
      !manifest.ok ||
      !isStringRecord(checksums) ||
      Object.keys(checksums).length !== parsed.value.length - 2
    )
      return err(error('PB-EXPORT-005'));
    for (const entry of parsed.value)
      if (
        entry.name !== 'manifest.json' &&
        entry.name !== 'checksums.json' &&
        checksums[entry.name] !== sha256(entry.bytes)
      )
        return err(error('PB-EXPORT-005'));
    if (packageDigest(parsed.value) !== manifest.value.packageHash)
      return err(error('PB-EXPORT-005'));
  } catch {
    return err(error('PB-EXPORT-005'));
  }
  return ok(true);
}
