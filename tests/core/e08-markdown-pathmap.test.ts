import { describe, expect, it } from 'vitest';
import {
  createPathMap,
  parseMarkdownRegions,
  replaceMarkdownSpans,
  rewriteWikilinks,
} from '@privacy-bridge/core';
describe('E08 Markdown and Path Map', () =>
  it('preserves untouched CRLF/BOM text and rewrites only wikilink target', () => {
    const bom = '\uFEFF',
      source = `${bom}---\r\nname: Alice\r\n---\r\n[[Other#title|Alice]]  \r\n`;
    const map = createPathMap([
      { documentId: 'a', relativePath: 'Notes/One.md' },
      { documentId: 'b', relativePath: 'Notes/Other.md' },
    ]);
    expect(map.ok).toBe(true);
    if (!map.ok) return;
    const rewritten = rewriteWikilinks(source, 'Notes/One.md', map.value);
    expect(rewritten.ok && rewritten.value).toBe(
      `${bom}---\r\nname: Alice\r\n---\r\n[[../DOC-000002/DOC-000002#title|Alice]]  \r\n`,
    );
    expect(parseMarkdownRegions(source).some((r) => r.kind === 'FRONTMATTER_VALUE')).toBe(true);
    expect(
      replaceMarkdownSpans(source, [
        { start: source.indexOf('Alice'), end: source.indexOf('Alice') + 5, replacement: 'TOKEN' },
      ]).ok,
    ).toBe(true);
  }));
