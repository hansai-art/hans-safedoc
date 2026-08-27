import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createEntityId, tokenFor, verifyToken } from '@privacy-bridge/core';
it('ACC-TOK-008 rejects a valid token when presented under another job', () => {
  const key = randomBytes(32),
    token = tokenFor(key, 'job-a', 'PERSON', createEntityId());
  expect(verifyToken(token, key, 'job-b').ok).toBe(false);
});
