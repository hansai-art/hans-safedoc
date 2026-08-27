import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createEntityId, tokenFor } from '@privacy-bridge/core';
it('ACC-TOK-001 generates 100k unique exact-grammar entity tokens without source text', () => {
  const key = randomBytes(32),
    tokens = new Set<string>();
  for (let i = 0; i < 100_000; i += 1)
    tokens.add(tokenFor(key, 'job-1', 'PERSON', createEntityId()));
  expect(tokens).toHaveLength(100_000);
  expect(
    [...tokens].every(
      (t) =>
        /^⟦PB:PERSON:[0-9A-HJKMNP-TV-Z]{16}:[0-9A-HJKMNP-TV-Z]{20}⟧$/u.test(t) &&
        !t.includes('Alice'),
    ),
  ).toBe(true);
});
