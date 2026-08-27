import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEntityId, tokenFor, tokenizeDocument, verifyToken } from '@privacy-bridge/core';
describe('E07 tokens', () =>
  it('rejects forgery and replaces in reverse with hash guards', () => {
    const key = randomBytes(32),
      token = tokenFor(key, 'job', 'EMAIL', createEntityId());
    expect(verifyToken(token, key, 'job').ok).toBe(true);
    expect(verifyToken(token.replace('EMAIL', 'URL'), key, 'job').ok).toBe(false);
    const source = 'a@example.com b@example.com',
      hash = (s: string) => createHash('sha256').update(s).digest('hex');
    const result = tokenizeDocument(source, [
      { start: 0, end: 13, sourceTextHash: hash('a@example.com'), token, handling: 'TOKENIZE' },
    ]);
    expect(result.ok && result.value.startsWith(token)).toBe(true);
  }));
