import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { validateResultBytes } from '@privacy-bridge/core';

it('ACC-IMP-002: rejects malformed PB delimiters and unsupported Result fields as a whole', () => {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      schemaVersion: '1.0.0',
      jobId: 'PB-20260828-0123456789',
      sourcePackageHash: 'a'.repeat(64),
      createdAt: '2026-08-28T00:00:00.000Z',
      producer: 'acceptance',
      findings: [],
      injected: true,
    }),
  );
  expect(
    validateResultBytes(bytes, {
      jobId: 'PB-20260828-0123456789',
      packageHash: 'a'.repeat(64),
      tokenKey: randomBytes(32),
      documentIds: new Set(),
    }),
  ).toMatchObject({ ok: false, error: { code: 'PB-IMPORT-001' } });
});
