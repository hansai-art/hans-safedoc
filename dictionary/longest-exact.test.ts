import { expect, it } from 'vitest';
import { matchDictionary } from '@privacy-bridge/core';
it('ACC-REV-006 picks the longest NFC exact dictionary term only', () => {
  const result = matchDictionary('星河科技股份有限公司與星河技術', {
    entries: [
      { term: '星河', type: 'ORGANIZATION' },
      { term: '星河科技', type: 'ORGANIZATION' },
      { term: '星河科技股份有限公司', type: 'ORGANIZATION' },
    ],
  });
  expect(result.map((m) => m.surfaceText)).toEqual(['星河科技股份有限公司', '星河']);
});
