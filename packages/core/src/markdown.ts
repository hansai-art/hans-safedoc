import { createHash } from 'node:crypto';
import { err, error, ok, type Result, type TextSpan } from './index.js';

export type MarkdownRegionKind =
  | 'FRONTMATTER_KEY'
  | 'FRONTMATTER_VALUE'
  | 'BODY_TEXT'
  | 'TABLE_CELL'
  | 'CODE_FENCE'
  | 'INLINE_CODE'
  | 'HTML_COMMENT'
  | 'WIKILINK_TARGET'
  | 'WIKILINK_DISPLAY'
  | 'TAG';
export interface MarkdownRegion extends TextSpan {
  readonly kind: MarkdownRegionKind;
  readonly line: number;
  readonly column: number;
  readonly sourceHash: string;
}
export interface Wikilink extends TextSpan {
  readonly target: TextSpan;
  readonly display?: TextSpan;
  readonly embed: boolean;
}
const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const pos = (source: string, offset: number) => {
  const before = source.slice(0, offset);
  return {
    line: before.split(/\r?\n/u).length,
    column: offset - Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r')),
  };
};
const add = (
  out: MarkdownRegion[],
  source: string,
  kind: MarkdownRegionKind,
  start: number,
  end: number,
) => {
  if (end <= start) return;
  const p = pos(source, start);
  out.push({ kind, start, end, ...p, sourceHash: digest(source.slice(start, end)) });
};

/** Region parser only locates spans. It never serializes or normalizes Markdown. */
export function parseMarkdownRegions(source: string): readonly MarkdownRegion[] {
  const out: MarkdownRegion[] = [];
  const bomLength = source.startsWith('\uFEFF') ? 1 : 0;
  const frontmatter = /^(---|\+\+\+)\r?\n([\s\S]*?)\r?\n\1(?:\r?\n|$)/u.exec(
    source.slice(bomLength),
  );
  let bodyStart = 0;
  if (frontmatter?.index === 0) {
    bodyStart = bomLength + frontmatter[0].length;
    const base =
      bomLength + frontmatter[1]!.length + (source.slice(bomLength).startsWith('\r\n') ? 2 : 1);
    for (const m of frontmatter[2]!.matchAll(
      /^([ \t-]*[^\r\n:#][^\r\n:]*?)(\s*:\s*)([^\r\n]*)$/gmu,
    )) {
      const start = base + (m.index ?? 0);
      add(out, source, 'FRONTMATTER_KEY', start, start + m[1]!.length);
      add(
        out,
        source,
        'FRONTMATTER_VALUE',
        start + m[1]!.length + m[2]!.length,
        start + m[0]!.length,
      );
    }
  }
  const fences: TextSpan[] = [];
  for (const m of source.matchAll(/^\s*(```+|~~~+)[^\r\n]*(?:\r?\n|$)[\s\S]*?^\s*\1\s*$/gmu)) {
    const start = m.index ?? 0;
    fences.push({ start, end: start + m[0].length });
    add(out, source, 'CODE_FENCE', start, start + m[0].length);
  }
  const inFence = (offset: number) => fences.some((f) => f.start <= offset && offset < f.end);
  for (const m of source.matchAll(/<!--[\s\S]*?-->/gu))
    add(out, source, 'HTML_COMMENT', m.index ?? 0, (m.index ?? 0) + m[0].length);
  for (const m of source.matchAll(/`[^`\r\n]+`/gu))
    if (!inFence(m.index ?? 0))
      add(out, source, 'INLINE_CODE', m.index ?? 0, (m.index ?? 0) + m[0].length);
  for (const m of source.matchAll(/(^|\n)([^\r\n]*\|[^\r\n]*)/gu)) {
    const lineStart = (m.index ?? 0) + m[1]!.length;
    let cursor = lineStart;
    for (const cell of m[2]!.split('|')) {
      add(out, source, 'TABLE_CELL', cursor, cursor + cell.length);
      cursor += cell.length + 1;
    }
  }
  for (const link of parseWikilinks(source)) {
    add(out, source, 'WIKILINK_TARGET', link.target.start, link.target.end);
    if (link.display) add(out, source, 'WIKILINK_DISPLAY', link.display.start, link.display.end);
  }
  for (const m of source.matchAll(/(?<!\w)#([\p{L}\p{N}_/-]+)/gu))
    add(out, source, 'TAG', m.index ?? 0, (m.index ?? 0) + m[0].length);
  for (const m of source.slice(bodyStart).matchAll(/[^\r\n]+/gu)) {
    const start = bodyStart + (m.index ?? 0);
    if (!inFence(start)) add(out, source, 'BODY_TEXT', start, start + m[0].length);
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end || a.kind.localeCompare(b.kind));
}

export function parseWikilinks(source: string): readonly Wikilink[] {
  const links: Wikilink[] = [];
  for (const m of source.matchAll(/(!?)\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/gu)) {
    const start = m.index ?? 0,
      content = start + m[1]!.length + 2;
    const targetEnd = content + m[2]!.length;
    links.push({
      start,
      end: start + m[0].length,
      target: { start: content, end: targetEnd },
      ...(m[3] === undefined
        ? {}
        : { display: { start: targetEnd + 1, end: targetEnd + 1 + m[3]!.length } }),
      embed: m[1] === '!',
    });
  }
  return links;
}
export function replaceMarkdownSpans(
  source: string,
  replacements: readonly (TextSpan & { readonly replacement: string })[],
): Result<string> {
  let output = source;
  let previous = source.length + 1;
  for (const span of [...replacements].sort((a, b) => b.start - a.start || b.end - a.end)) {
    if (span.start < 0 || span.end <= span.start || span.end > source.length || span.end > previous)
      return err(error('PB-SCAN-001'));
    previous = span.start;
    output = output.slice(0, span.start) + span.replacement + output.slice(span.end);
  }
  return ok(output);
}
