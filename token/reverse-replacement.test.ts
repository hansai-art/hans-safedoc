import { createHash, randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createEntityId, tokenFor, tokenizeDocument } from '@privacy-bridge/core';
it('ACC-TOK-005 replaces adjacent accepted spans from the end with exact output', () => {
  const source = 'alice@example.combob@example.com',
    key = randomBytes(32),
    hash = (v: string) => createHash('sha256').update(v).digest('hex');
  const a = tokenFor(key, 'job', 'EMAIL', createEntityId()),
    b = tokenFor(key, 'job', 'EMAIL', createEntityId());
  const result = tokenizeDocument(source, [
    {
      start: 0,
      end: 17,
      sourceTextHash: hash('alice@example.com'),
      token: a,
      handling: 'TOKENIZE',
    },
    {
      start: 17,
      end: source.length,
      sourceTextHash: hash('bob@example.com'),
      token: b,
      handling: 'TOKENIZE',
    },
  ]);
  expect(result.ok && result.value).toBe(`${a}${b}`);
});
