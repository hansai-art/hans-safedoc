import { expect, it } from 'vitest';
import { deriveJobKey } from '@privacy-bridge/core';
it('ACC-TOK-009 derives distinct domain keys from fixed root, client, and job', async () => {
  const root = new Uint8Array(32).fill(7);
  const a = await deriveJobKey(root, 'client', 'job', 'PB/v1/token-auth');
  const b = await deriveJobKey(root, 'client', 'job', 'PB/v1/job-data');
  expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  expect(a).toHaveLength(32);
});
