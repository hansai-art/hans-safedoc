import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-009 retains ARC and invoice alternatives', () => {
  const result = detectAll('編號：AB12345677');
  expect(result.ok && result.value[0]).toMatchObject({
    primaryType: 'AMBIGUOUS_IDENTIFIER',
    alternativeTypes: ['TW_ARC', 'TW_INVOICE'],
    handling: 'BLOCK_EXPORT',
  });
});
