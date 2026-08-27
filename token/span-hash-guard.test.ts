import { createHash, randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createEntityId, tokenFor, tokenizeDocument } from '@privacy-bridge/core';
it('ACC-TOK-006 fails a changed source span before emitting tokenized output', () => {
  const source = 'changed@example.com',
    token = tokenFor(randomBytes(32), 'job', 'EMAIL', createEntityId());
  const result = tokenizeDocument(source, [
    {
      start: 0,
      end: source.length,
      sourceTextHash: createHash('sha256').update('original@example.com').digest('hex'),
      token,
      handling: 'TOKENIZE',
    },
  ]);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('PB-FILE-004');
});
