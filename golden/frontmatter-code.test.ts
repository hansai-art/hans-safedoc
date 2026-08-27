import { expect, it } from 'vitest';
import { parseMarkdownRegions } from '@privacy-bridge/core';

it('ACC-EXP-002: separates frontmatter values and code regions without renaming keys', () => {
  const regions = parseMarkdownRegions('---\r\nowner: Alice\r\n---\r\n```env\nSECRET=abc\n```\r\n');
  expect(regions.filter((region) => region.kind === 'FRONTMATTER_KEY')).toHaveLength(1);
  expect(regions.filter((region) => region.kind === 'FRONTMATTER_VALUE')).toHaveLength(1);
  expect(regions.filter((region) => region.kind === 'CODE_FENCE')).toHaveLength(1);
});
