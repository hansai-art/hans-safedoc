import { expect, it } from 'vitest';
import { createPathMap, rewriteWikilinks } from '@privacy-bridge/core';

it('ACC-EXP-004: rewrites wikilink paths while retaining headings and block references', () => {
  const map = createPathMap([
    { documentId: 'a', relativePath: 'private/a.md' },
    { documentId: 'b', relativePath: 'private/b.md' },
  ]);
  if (!map.ok) throw new Error('path map');
  expect(rewriteWikilinks('[[b#Heading^block|Label]]', 'private/a.md', map.value)).toEqual({
    ok: true,
    value: '[[../DOC-000002/b#Heading^block|Label]]',
  });
});
