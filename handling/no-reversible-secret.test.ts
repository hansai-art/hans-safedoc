import { expect, it } from 'vitest';
import { validateCandidateHandling } from '@privacy-bridge/core';
it('ACC-TOK-014 rejects TOKENIZE for accepted secret and credit-card candidates', () => {
  expect(
    validateCandidateHandling({ primaryType: 'SECRET', handling: 'BLOCK_EXPORT' }, 'TOKENIZE').ok,
  ).toBe(false);
  expect(
    validateCandidateHandling({ primaryType: 'CREDIT_CARD', handling: 'BLOCK_EXPORT' }, 'REDACT')
      .ok,
  ).toBe(true);
});
