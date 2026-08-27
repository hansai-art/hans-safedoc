import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-013 tiers known and contextual passport formats', () => {
  const result = detectAll('D12345678 護照：A12345678');
  expect(result.ok && result.value.map((c) => c.primaryType)).toEqual([
    'TW_PASSPORT',
    'PASSPORT_CANDIDATE',
  ]);
});
