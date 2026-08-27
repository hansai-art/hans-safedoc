import { describe, expect, it } from 'vitest';
import {
  SAFE_PACKAGE_LIMIT,
  buildSafePackage,
  normalizeSafeEntryPath,
  validateSafePackage,
} from '@privacy-bridge/core';

const jobId = 'PB-20260828-0123456789';
const uuid = '123e4567-e89b-42d3-a456-426614174000';
const input = {
  jobId,
  pluginVersion: '1.0.0',
  rulesVersion: '1.0.0',
  sourceSnapshotHash: 'a'.repeat(64),
  createdAt: '2026-08-28T00:00:00.000Z',
  documents: [{ documentId: uuid, relativePath: 'documents/0001.md', content: '# safe' }],
  entities: [{ token: '⟦PB:PERSON:ABC⟧', type: 'PERSON', documentIds: [uuid] }],
};

describe('E11 Safe Package', () => {
  it('builds an allowlisted, checksummed package and validates it by read-back', () => {
    const built = buildSafePackage(input);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.packageHash).toMatch(/^[0-9a-f]{64}$/);
    expect(validateSafePackage(built.value.bytes).ok).toBe(true);
    expect(new TextDecoder().decode(built.value.bytes)).not.toContain('original/path');
  });

  it('rejects ZIP-slip, absolute, empty, backslash and symlink-like entry names', () => {
    for (const value of ['../secret', '/secret', 'C:\\secret', '', 'a\\b', 'a/../b', 'a//b'])
      expect(normalizeSafeEntryPath(value).ok).toBe(false);
  });

  it('fails closed before writing when the 2GB estimate would be exceeded', () => {
    const built = buildSafePackage({ ...input, estimatedBytes: SAFE_PACKAGE_LIMIT + 1 });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.error.code).toBe('PB-EXPORT-005');
  });
});
