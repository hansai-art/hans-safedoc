import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-006 does not carry passport context across a newline', () => {
  const result = detectAll('護照：\n訂單號：123456789');
  expect(result.ok && result.value.some((c) => c.primaryType === 'PASSPORT_CANDIDATE')).toBe(false);
});
