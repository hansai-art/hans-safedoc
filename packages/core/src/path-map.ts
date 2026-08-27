import { createHash } from 'node:crypto';
import { basename, dirname, posix, relative } from 'node:path';
import { err, error, ok, type Result } from './index.js';
import { parseWikilinks, replaceMarkdownSpans } from './markdown.js';

export interface PathMapEntry {
  readonly documentId: string;
  readonly sourceRelativePath: string;
  readonly sanitizedRelativePath: string;
  readonly sourcePathHash: string;
}
const safe = (value: string) => value.replace(/\\/gu, '/');
export function normalizeRelativePath(value: string): Result<string> {
  const raw = safe(value);
  if (
    !raw ||
    raw.startsWith('/') ||
    /^[A-Za-z]:/u.test(raw) ||
    raw.split('/').some((s) => !s || s === '.' || s === '..' || s.includes('\0'))
  )
    return err(error('PB-FILE-005'));
  const normalized = posix.normalize(raw);
  return normalized.startsWith('../') || normalized === '..'
    ? err(error('PB-FILE-005'))
    : ok(normalized);
}
export function createPathMap(
  documents: readonly { documentId: string; relativePath: string }[],
): Result<readonly PathMapEntry[]> {
  const seen = new Set<string>();
  const entries: PathMapEntry[] = [];
  for (let index = 0; index < documents.length; index += 1) {
    const doc = documents[index]!;
    const path = normalizeRelativePath(doc.relativePath);
    if (!path.ok || seen.has(path.value.normalize('NFC').toLocaleLowerCase('en-US')))
      return err(error('PB-FILE-006'));
    seen.add(path.value.normalize('NFC').toLocaleLowerCase('en-US'));
    entries.push({
      documentId: doc.documentId,
      sourceRelativePath: path.value,
      sanitizedRelativePath: `DOC-${String(index + 1).padStart(6, '0')}/${basename(path.value)}`,
      sourcePathHash: createHash('sha256').update(path.value, 'utf8').digest('hex'),
    });
  }
  return ok(entries);
}
export function rewriteWikilinks(
  source: string,
  sourcePath: string,
  paths: readonly PathMapEntry[],
): Result<string> {
  const sourceSafe = normalizeRelativePath(sourcePath);
  if (!sourceSafe.ok) return sourceSafe;
  const bySource = new Map(paths.map((entry) => [entry.sourceRelativePath, entry]));
  const current = bySource.get(sourceSafe.value);
  if (!current) return err(error('PB-FILE-004'));
  const replacements = [] as { start: number; end: number; replacement: string }[];
  for (const link of parseWikilinks(source)) {
    const raw = source.slice(link.target.start, link.target.end);
    const match = /^(.*?)([\^#].*)?$/u.exec(raw);
    const targetPart = match?.[1] ?? raw;
    const suffix = match?.[2] ?? '';
    if (!targetPart || /:\/\//u.test(targetPart)) continue;
    const candidate = posix.normalize(
      posix.join(
        dirname(sourceSafe.value),
        targetPart.endsWith('.md') ? targetPart : `${targetPart}.md`,
      ),
    );
    const target = bySource.get(candidate);
    if (!target) continue;
    let rewritten = relative(dirname(current.sanitizedRelativePath), target.sanitizedRelativePath)
      .split('\\')
      .join('/');
    if (!targetPart.endsWith('.md')) rewritten = rewritten.replace(/\.md$/u, '');
    replacements.push({
      start: link.target.start,
      end: link.target.end,
      replacement: `${rewritten}${suffix}`,
    });
  }
  return replaceMarkdownSpans(source, replacements);
}
