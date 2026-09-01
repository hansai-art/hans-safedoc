import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { RESULT_LIMIT, validateResultBytes } from '@privacy-bridge/core';

it('ACC-IMP-008: rejects oversized and deeply nested Result JSON before dangerous parsing', () => {
  const expected = {
    jobId: 'PB-20260828-0123456789',
    packageHash: 'a'.repeat(64),
    tokenKey: randomBytes(32),
    documentIds: new Set<string>(),
    knownTokens: new Set<string>(),
  };
  expect(validateResultBytes(new Uint8Array(RESULT_LIMIT + 1), expected)).toMatchObject({
    ok: false,
    error: { code: 'PB-IMPORT-005' },
  });
  const deep = new TextEncoder().encode(`${'['.repeat(65)}${']'.repeat(65)}`);
  expect(validateResultBytes(deep, expected)).toMatchObject({
    ok: false,
    error: { code: 'PB-IMPORT-005' },
  });
});
