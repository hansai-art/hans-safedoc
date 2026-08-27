import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createEntityId, tokenFor, validateResultBytes } from '@privacy-bridge/core';

it('ACC-IMP-003: rejects a forged token in any Result finding with generic import error', () => {
  const key = randomBytes(32),
    jobId = 'PB-20260828-0123456789',
    documentId = '123e4567-e89b-42d3-a456-426614174000';
  const token = `${tokenFor(key, jobId, 'PERSON', createEntityId()).slice(0, -2)}X⟧`;
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      schemaVersion: '1.0.0',
      jobId,
      sourcePackageHash: 'a'.repeat(64),
      createdAt: '2026-08-28T00:00:00.000Z',
      producer: 'acceptance',
      findings: [
        {
          findingId: '223e4567-e89b-42d3-a456-826614174000',
          entityRefs: [token],
          category: 'finding',
          summary: token,
          sourceDocumentIds: [documentId],
        },
      ],
    }),
  );
  expect(
    validateResultBytes(bytes, {
      jobId,
      packageHash: 'a'.repeat(64),
      tokenKey: key,
      documentIds: new Set([documentId]),
    }),
  ).toMatchObject({ ok: false, error: { code: 'PB-IMPORT-003' } });
});
