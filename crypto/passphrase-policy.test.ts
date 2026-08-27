import { expect, it } from 'vitest';
import { validatePassphrase } from '@privacy-bridge/core';
it('ACC-TOK-012 enforces 12 through 256 code points without normalization', () => {
  expect(validatePassphrase('a'.repeat(11)).ok).toBe(false);
  expect(validatePassphrase('😀'.repeat(12)).ok).toBe(true);
  expect(validatePassphrase('a'.repeat(256)).ok).toBe(true);
  expect(validatePassphrase('a'.repeat(257)).ok).toBe(false);
});
