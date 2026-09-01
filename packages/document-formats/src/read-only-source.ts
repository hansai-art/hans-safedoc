import { open, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export type RecheckPoint =
  | 'after-extraction'
  | 'before-rewrite'
  | 'before-staging-write'
  | 'before-publish'
  | 'after-publish';
export interface SourceSnapshot {
  readonly sha256: string;
  readonly size: number;
  readonly mtimeMs: number;
}
export interface ReadOnlySource {
  readonly path: string;
  readonly snapshot: SourceSnapshot;
  read(): Promise<Buffer>;
  recheck(point: RecheckPoint): Promise<{ point: RecheckPoint; metadataOnlyChange: boolean }>;
}
export interface ReadOnlySourceOptions {
  readonly maxBytes?: number;
}
export class SourceChangedError extends Error {
  constructor(readonly point: RecheckPoint) {
    super(`Source bytes changed at ${point}`);
    this.name = 'SourceChangedError';
  }
}
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

async function readBounded(
  handle: Awaited<ReturnType<typeof open>>,
  maxBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  while (total <= maxBytes) {
    const capacity = Math.min(64 * 1024, maxBytes - total + 1);
    const chunk = Buffer.allocUnsafe(capacity);
    const { bytesRead } = await handle.read(chunk, 0, capacity, null);
    if (bytesRead === 0) break;
    chunks.push(chunk.subarray(0, bytesRead));
    total += bytesRead;
    if (total > maxBytes) throw new TypeError('Source exceeds the permitted size.');
  }
  return Buffer.concat(chunks, total);
}

async function secureRead(path: string, options: ReadOnlySourceOptions): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    const metadata = await handle.stat();
    if (
      !metadata.isFile() ||
      (options.maxBytes !== undefined &&
        (!Number.isSafeInteger(options.maxBytes) ||
          options.maxBytes < 0 ||
          metadata.size > options.maxBytes))
    )
      throw new TypeError('Source is not a permitted regular file.');
    return options.maxBytes === undefined
      ? await handle.readFile()
      : await readBounded(handle, options.maxBytes);
  } finally {
    await handle.close();
  }
}

export async function openReadOnlySource(
  path: string,
  options: ReadOnlySourceOptions = {},
): Promise<ReadOnlySource> {
  const initialBytes = await secureRead(path, options);
  const initialStat = await stat(path);
  const snapshot = Object.freeze({
    sha256: hash(initialBytes),
    size: initialBytes.length,
    mtimeMs: initialStat.mtimeMs,
  });
  return Object.freeze({
    path,
    snapshot,
    read: () => secureRead(path, options),
    async recheck(point: RecheckPoint) {
      const bytes = await secureRead(path, options);
      const current = await stat(path);
      if (bytes.length !== snapshot.size || hash(bytes) !== snapshot.sha256)
        throw new SourceChangedError(point);
      return { point, metadataOnlyChange: current.mtimeMs !== snapshot.mtimeMs };
    },
  });
}
