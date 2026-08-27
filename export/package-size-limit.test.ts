import { expect, it } from 'vitest';
import { SAFE_PACKAGE_LIMIT, buildSafePackage } from '@privacy-bridge/core';

it('ACC-EXP-012: stops before package creation when the 2GB estimate is exceeded', () => {
  const result = buildSafePackage({
    jobId: 'PB-20260828-0123456789',
    pluginVersion: '1.0.0',
    rulesVersion: '1.0.0',
    sourceSnapshotHash: 'a'.repeat(64),
    createdAt: '2026-08-28T00:00:00.000Z',
    documents: [],
    entities: [],
    estimatedBytes: SAFE_PACKAGE_LIMIT + 1,
  });
  expect(result).toMatchObject({ ok: false, error: { code: 'PB-EXPORT-005' } });
});
