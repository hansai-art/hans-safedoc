import { deflateRawSync, inflateRawSync } from 'node:zlib';
import type { FormatLocatorV11 } from '../contracts.js';

export interface ZipEntry {
  name: string;
  data: Buffer;
  method: number;
  crc: number;
  compressed?: Buffer;
}
export interface OoxmlBlockerEvidence {
  code: string;
  locator?: FormatLocatorV11;
}
export class OoxmlBlockedError extends Error {
  constructor(
    readonly blockers: readonly string[],
    readonly evidence: readonly OoxmlBlockerEvidence[] = [],
  ) {
    super(`OOXML blocked: ${blockers.join(', ')}`);
    this.name = 'OoxmlBlockedError';
  }
}
const MAX_ENTRIES = 10_000,
  MAX_COMPRESSED = 25 * 1024 * 1024,
  MAX_ENTRY = 25 * 1024 * 1024,
  MAX_TOTAL = 256 * 1024 * 1024,
  MAX_RATIO = 20;
let crcTable: Uint32Array | undefined;
function table(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}
export function crc32(data: Buffer): number {
  let c = 0xffffffff;
  const t = table();
  for (const b of data) c = t[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function readZip(source: Buffer): ZipEntry[] {
  if (source.length > MAX_COMPRESSED) throw new OoxmlBlockedError(['zip-compressed-limit']);
  let eocd = -1;
  for (let i = source.length - 22; i >= Math.max(0, source.length - 65_557); i--)
    if (source.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new OoxmlBlockedError(['invalid-zip']);
  const count = source.readUInt16LE(eocd + 10),
    centralOffset = source.readUInt32LE(eocd + 16);
  if (count > MAX_ENTRIES) throw new OoxmlBlockedError(['zip-entry-limit']);
  const seen = new Set<string>();
  const entries: ZipEntry[] = [];
  let offset = centralOffset,
    total = 0;
  for (let index = 0; index < count; index++) {
    if (source.readUInt32LE(offset) !== 0x02014b50)
      throw new OoxmlBlockedError(['invalid-central-directory']);
    const flags = source.readUInt16LE(offset + 8),
      method = source.readUInt16LE(offset + 10),
      crc = source.readUInt32LE(offset + 16),
      compressedSize = source.readUInt32LE(offset + 20),
      size = source.readUInt32LE(offset + 24);
    const nameLength = source.readUInt16LE(offset + 28),
      extraLength = source.readUInt16LE(offset + 30),
      commentLength = source.readUInt16LE(offset + 32),
      localOffset = source.readUInt32LE(offset + 42);
    const name = source
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString(flags & 0x800 ? 'utf8' : 'utf8');
    if ((flags & 1) !== 0 || ![0, 8].includes(method))
      throw new OoxmlBlockedError(['encrypted-or-unsupported-compression']);
    const canonical = name.normalize('NFC').toLowerCase();
    if (
      !name ||
      name.startsWith('/') ||
      name.includes('\\') ||
      name.split('/').includes('..') ||
      seen.has(canonical)
    )
      throw new OoxmlBlockedError(['unsafe-or-duplicate-entry']);
    seen.add(canonical);
    if (size > MAX_ENTRY || (compressedSize > 0 && size / compressedSize > MAX_RATIO))
      throw new OoxmlBlockedError(['zip-resource-limit']);
    total += size;
    if (total > MAX_TOTAL) throw new OoxmlBlockedError(['zip-total-limit']);
    if (source.readUInt32LE(localOffset) !== 0x04034b50)
      throw new OoxmlBlockedError(['invalid-local-header']);
    const localNameLength = source.readUInt16LE(localOffset + 26),
      localExtraLength = source.readUInt16LE(localOffset + 28);
    const localName = source
      .subarray(localOffset + 30, localOffset + 30 + localNameLength)
      .toString();
    if (localName !== name) throw new OoxmlBlockedError(['central-local-name-mismatch']);
    const compressed = source.subarray(
      localOffset + 30 + localNameLength + localExtraLength,
      localOffset + 30 + localNameLength + localExtraLength + compressedSize,
    );
    const data =
      method === 0
        ? Buffer.from(compressed)
        : inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY });
    if (data.length !== size || crc32(data) !== crc)
      throw new OoxmlBlockedError(['zip-integrity-failure']);
    entries.push({ name, data, method, crc, compressed: Buffer.from(compressed) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
function u16(n: number) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}
function u32(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
}
export function writeZip(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const method = entry.method === 0 ? 0 : 8;
    const compressed =
      entry.compressed && entry.crc === crc && data.length === entry.data.length
        ? entry.compressed
        : method === 0
          ? data
          : deflateRawSync(data);
    const flags = 0x800;
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(flags),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      compressed,
    ]);
    locals.push(local);
    centrals.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(flags),
        u16(method),
        u16(0),
        u16(0),
        u32(crc),
        u32(compressed.length),
        u32(data.length),
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
    offset += local.length;
  }
  const central = Buffer.concat(centrals);
  return Buffer.concat([
    ...locals,
    central,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
}
export function replaceZipEntries(source: Buffer, changes: ReadonlyMap<string, Buffer>): Buffer {
  const entries = readZip(source).map((entry): ZipEntry => {
    const changed = changes.get(entry.name);
    if (changed === undefined) return entry;
    return { name: entry.name, data: changed, method: entry.method, crc: entry.crc };
  });
  return writeZip(entries);
}
