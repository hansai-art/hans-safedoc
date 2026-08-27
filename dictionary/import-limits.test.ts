import { expect, it } from 'vitest';
import { validateDictionaryImport } from '@privacy-bridge/core';
it('ACC-REV-011 rejects an over-limit import before any dictionary can be accepted', () => {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      entries: Array.from({ length: 50_001 }, () => ({ term: 'x', type: 'PERSON' })),
    }),
  );
  expect(validateDictionaryImport(bytes).ok).toBe(false);
});
