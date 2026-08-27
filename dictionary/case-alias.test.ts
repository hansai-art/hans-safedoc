import { expect, it } from 'vitest';
import { matchDictionary } from '@privacy-bridge/core';
it('ACC-REV-007 honors case sensitivity and explicit aliases without fuzzy matching', () => {
  const result = matchDictionary('Acme ACME acm Ac', {
    entries: [
      { term: 'Acme', aliases: ['Ac'], type: 'ORGANIZATION', caseSensitive: true },
      { term: 'acme', type: 'ORGANIZATION', caseSensitive: false },
    ],
  });
  expect(result.map((m) => m.surfaceText)).toEqual(['Acme', 'ACME', 'Ac']);
});
