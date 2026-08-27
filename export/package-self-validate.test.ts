import { expect, it } from 'vitest';
import { buildSafePackage, validateSafePackage } from '@privacy-bridge/core';

it('ACC-EXP-011: corruption fails package self-validation before an export transition', () => {
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
  if (!built.ok) throw new Error('package');
  const corrupt = new Uint8Array(built.value.bytes);
  corrupt[40] = corrupt[40]! ^ 1;
  expect(validateSafePackage(corrupt).ok).toBe(false);
});
