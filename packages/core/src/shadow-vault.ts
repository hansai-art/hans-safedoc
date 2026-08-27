import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { err, error, ok, type Result } from './index.js';
import { parseWikilinks } from './markdown.js';
import { normalizeRelativePath, type PathMapEntry } from './path-map.js';

export interface ShadowDocument {
  readonly documentId: string;
  readonly sourceRelativePath: string;
  readonly sourceSha256: string;
  readonly content: Uint8Array;
}
export interface ShadowBuild {
  readonly root: string;
  readonly files: readonly {
    documentId: string;
    relativePath: string;
    sha256: string;
    size: number;
  }[];
  readonly warnings: readonly string[];
}
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const inside = (root: string, child: string) => child === root || child.startsWith(`${root}${sep}`);
async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}
async function outputPath(parent: string, jobId: string): Promise<string> {
  for (let sequence = 1; sequence < 10000; sequence += 1) {
    const candidate = resolve(parent, `${jobId}-sanitized${sequence === 1 ? '' : `-${sequence}`}`);
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error('output sequence exhausted');
}
/** Builds only sanitized Markdown. Secure maps, keys, journals and audit never cross this boundary. */
export async function buildShadowVault(input: {
  readonly jobId: string;
  readonly sourceRoot: string;
  readonly outputParent: string;
  readonly documents: readonly ShadowDocument[];
  readonly pathMap: readonly PathMapEntry[];
}): Promise<Result<ShadowBuild>> {
  let staging: string | undefined;
  try {
    const sourceRoot = await realpath(input.sourceRoot),
      parent = await realpath(input.outputParent);
    if (inside(sourceRoot, parent) || input.documents.length !== input.pathMap.length)
      return err(error('PB-FILE-005'));
    const finalPath = await outputPath(parent, input.jobId);
    staging = resolve(parent, `.privacy-bridge-staging-${randomUUID()}`);
    await mkdir(staging, { mode: 0o700 });
    const map = new Map(input.pathMap.map((entry) => [entry.documentId, entry]));
    const files: { documentId: string; relativePath: string; sha256: string; size: number }[] = [];
    for (const document of input.documents) {
      const entry = map.get(document.documentId),
        path = entry && normalizeRelativePath(entry.sanitizedRelativePath);
      if (
        !entry ||
        !path?.ok ||
        !path.value.endsWith('.md') ||
        path.value.split('/').some((segment) => segment.toLowerCase() === '.obsidian') ||
        hash(document.content) !== document.sourceSha256
      )
        return err(error('PB-FILE-004'));
      const target = resolve(staging, path.value);
      if (!inside(staging, target)) return err(error('PB-FILE-005'));
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, document.content, { flag: 'wx', mode: 0o600 });
      const actual = new Uint8Array(await readFile(target));
      if (hash(actual) !== hash(document.content)) return err(error('PB-EXPORT-003'));
      files.push({
        documentId: document.documentId,
        relativePath: path.value,
        sha256: hash(actual),
        size: actual.byteLength,
      });
    }
    const paths = new Set(files.map((file) => file.relativePath));
    const warnings: string[] = [];
    for (const file of files) {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(
        await readFile(resolve(staging, file.relativePath)),
      );
      for (const link of parseWikilinks(text)) {
        const target = text.slice(link.target.start, link.target.end).split(/[\^#]/u, 1)[0]!;
        if (
          target &&
          !/[:/]/u.test(target) &&
          !paths.has(target.endsWith('.md') ? target : `${target}.md`)
        )
          warnings.push(`UNRESOLVED_LINK:${file.documentId}`);
      }
    }
    await rename(staging, finalPath);
    staging = undefined;
    return ok({
      root: finalPath,
      files: files.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
      warnings: [...new Set(warnings)],
    });
  } catch {
    return err(error('PB-EXPORT-003'));
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}
