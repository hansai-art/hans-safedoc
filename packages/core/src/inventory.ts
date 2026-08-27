import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { basename, relative, resolve, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { err, error, ok, type Result } from './index.js';

export interface SourceAdapter {
  readonly root: string;
  list(path: string): Promise<readonly string[]>;
  readBytes(path: string): Promise<Uint8Array>;
  stat(path: string): Promise<{
    readonly isDirectory: boolean;
    readonly isSymbolicLink: boolean;
    readonly size: number;
    readonly mtimeMs: number;
  }>;
  realpath(path: string): Promise<string>;
}
export interface InventoryDocument {
  readonly documentId: string;
  readonly relativePath: string;
  readonly size: number;
  readonly mtimeMs: number;
  readonly sha256: string;
  readonly bom: boolean;
  readonly lineEnding: 'LF' | 'CRLF' | 'NONE';
}
export interface FileInventory {
  readonly documents: readonly InventoryDocument[];
  readonly unsupported: readonly string[];
  readonly blockers: readonly string[];
}
const SYSTEM = new Set(['.obsidian', '.trash', '.git', 'privacy-bridge staging']);
export function createNodeSourceAdapter(root: string): SourceAdapter {
  const resolved = resolve(root);
  return {
    root: resolved,
    list: async (path) => (await readdir(path)).sort(),
    readBytes: async (path) => new Uint8Array(await readFile(path)),
    stat: async (path) => {
      const entry = await lstat(path);
      return {
        isDirectory: entry.isDirectory(),
        isSymbolicLink: entry.isSymbolicLink(),
        size: entry.size,
        mtimeMs: entry.mtimeMs,
      };
    },
    realpath,
  };
}
export async function createInventory(adapter: SourceAdapter): Promise<Result<FileInventory>> {
  const root = await adapter.realpath(adapter.root);
  const documents: InventoryDocument[] = [];
  const unsupported: string[] = [];
  const blockers = new Set<string>();
  async function walk(current: string): Promise<void> {
    for (const name of await adapter.list(current)) {
      const absolute = resolve(current, name);
      const entry = await adapter.stat(absolute);
      const rel = relative(root, absolute).split(sep).join('/');
      if (entry.isSymbolicLink) {
        blockers.add('PB-FILE-003');
        continue;
      }
      if (entry.isDirectory) {
        if (!SYSTEM.has(basename(absolute))) await walk(absolute);
        continue;
      }
      if (!absolute.toLowerCase().endsWith('.md')) {
        unsupported.push(rel);
        blockers.add('PB-FILE-001');
        continue;
      }
      const bytes = await adapter.readBytes(absolute);
      const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
      const body = bytes.subarray(bom ? 3 : 0);
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(body);
      documents.push({
        documentId: randomUUID(),
        relativePath: rel,
        size: entry.size,
        mtimeMs: entry.mtimeMs,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bom,
        lineEnding: decoded.includes('\r\n') ? 'CRLF' : decoded.length === 0 ? 'NONE' : 'LF',
      });
    }
  }
  try {
    await walk(root);
  } catch {
    return err(error('PB-FILE-002'));
  }
  return ok({
    documents: documents.sort((a, b) =>
      a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0,
    ),
    unsupported: unsupported.sort(),
    blockers: [...blockers].sort(),
  });
}
