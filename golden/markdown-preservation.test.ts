import { expect, it } from 'vitest';
import { replaceMarkdownSpans } from '@privacy-bridge/core';

it('ACC-EXP-001: preserves BOM, CRLF, YAML and comments outside approved Markdown spans', () => {
  const source = '\uFEFF---\r\ntitle: Private\r\n---\r\n<!-- keep -->\r\nHello Alice\r\n';
  const start = source.indexOf('Alice');
  const result = replaceMarkdownSpans(source, [
    { start, end: start + 5, replacement: '⟦PB:PERSON:X⟧' },
  ]);
  expect(result).toEqual({
    ok: true,
    value: '\uFEFF---\r\ntitle: Private\r\n---\r\n<!-- keep -->\r\nHello ⟦PB:PERSON:X⟧\r\n',
  });
});
