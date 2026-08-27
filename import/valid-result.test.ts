import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createEntityId, tokenFor, transitionJob, validateResultBytes } from '@privacy-bridge/core';

it('ACC-IMP-001: validates exact UTF-8 Result schema and enters RESULT_IMPORTED', () => {
  const key = randomBytes(32),
    jobId = 'PB-20260828-0123456789',
    documentId = '123e4567-e89b-42d3-a456-426614174000';
  const token = tokenFor(key, jobId, 'PERSON', createEntityId());
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
          summary: `Found ${token}`,
          sourceDocumentIds: [documentId],
          evidence: [{ documentId, excerpt: token }],
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
    }).ok,
  ).toBe(true);
  expect(transitionJob('EXPORTED', 'RESULT_IMPORTED')).toEqual({
    ok: true,
    value: 'RESULT_IMPORTED',
  });
});
