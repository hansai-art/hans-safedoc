import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createEntityId, tokenFor, verifyToken } from '@privacy-bridge/core';
it('ACC-TOK-007 rejects modified ID, tag, and type without an existence oracle', () => {
  const key = randomBytes(32),
    token = tokenFor(key, 'job', 'PERSON', createEntityId());
  expect(
    [
      token.replace('PERSON', 'SYSTEM'),
      `${token.slice(0, -2)}X⟧`,
      token.replace(/:[0-9A-HJKMNP-TV-Z]{16}:/u, ':0000000000000000:'),
    ].every((v) => !verifyToken(v, key, 'job').ok),
  ).toBe(true);
});
