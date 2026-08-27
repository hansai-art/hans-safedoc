import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-007 records same label-value context evidence', () => {
  const result = detectAll('護照: A12345678');
  expect(result.ok && result.value[0]?.evidence).toContainEqual({
    source: 'SAME_LABEL_VALUE',
    hint: '護照',
  });
});
