import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { assignEntityTokens } from '@privacy-bridge/core';
it('ACC-TOK-003 derives different tokens and fingerprints across jobs', () => {
  const key = randomBytes(32),
    input = [{ type: 'EMAIL' as const, value: 'a@example.com' }];
  const first = assignEntityTokens(key, 'job-a', input)[0]!,
    second = assignEntityTokens(key, 'job-b', input)[0]!;
  expect(first.token).not.toBe(second.token);
  expect(first.entityId).not.toBe(second.entityId);
});
