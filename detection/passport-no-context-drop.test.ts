import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-014 drops a broad passport-shaped order number without context', () => {
  const result = detectAll('訂單號：123456789');
  expect(result.ok && result.value).toHaveLength(0);
});
