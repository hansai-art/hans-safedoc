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
export class SourceChangedError extends Error {
  constructor(readonly point: RecheckPoint) {
    super(`Source bytes changed at ${point}`);
    this.name = 'SourceChangedError';
  }
}
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

async function secureRead(path: string): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

export async function openReadOnlySource(path: string): Promise<ReadOnlySource> {
  const initialBytes = await secureRead(path);
  const initialStat = await stat(path);
  const snapshot = Object.freeze({
    sha256: hash(initialBytes),
    size: initialBytes.length,
    mtimeMs: initialStat.mtimeMs,
  });
  return Object.freeze({
    path,
    snapshot,
    read: () => secureRead(path),
    async recheck(point: RecheckPoint) {
      const bytes = await secureRead(path);
      const current = await stat(path);
      if (bytes.length !== snapshot.size || hash(bytes) !== snapshot.sha256)
        throw new SourceChangedError(point);
      return { point, metadataOnlyChange: current.mtimeMs !== snapshot.mtimeMs };
    },
  });
}
