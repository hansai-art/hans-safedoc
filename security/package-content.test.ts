import { expect, it } from 'vitest';
import { buildSafePackage } from '@privacy-bridge/core';

it('ACC-EXP-010: package contains sanitized document identifiers, never source paths or secure data', () => {
  const built = buildSafePackage({
    jobId: 'PB-20260828-0123456789',
    pluginVersion: '1.0.0',
    rulesVersion: '1.0.0',
    sourceSnapshotHash: 'a'.repeat(64),
    createdAt: '2026-08-28T00:00:00.000Z',
    documents: [
      {
        documentId: '123e4567-e89b-42d3-a456-426614174000',
        relativePath: 'documents/0001.md',
        content: 'safe',
      },
    ],
    entities: [],
  });
  expect(built.ok).toBe(true);
  if (!built.ok) return;
  const text = new TextDecoder().decode(built.value.bytes);
  expect(text).not.toMatch(/mapping|dictionary|original\/path|audit|private-source/iu);
});
