import { expect, it } from 'vitest';
import { appendAudit, verifyAudit } from '@privacy-bridge/core';

it('ACC-OPS-001: audit allows only metadata and rejects raw-value-like canaries', () => {
  const safe = appendAudit([], {
    timestamp: '2026-08-28T00:00:00.000Z',
    jobId: 'PB-20260828-0123456789',
    deviceId: 'device',
    operatorAliasFingerprint: 'fingerprint',
    action: 'EXPORT',
    subjectId: 'document-id',
    safeCounts: { findings: 1 },
    pluginVersion: '1.0.0',
  });
  expect(safe.ok && verifyAudit([safe.value]).ok).toBe(true);
  expect(
    appendAudit([], {
      timestamp: '2026-08-28T00:00:00.000Z',
      jobId: 'PB-20260828-0123456789',
      deviceId: 'device',
      operatorAliasFingerprint: 'fingerprint',
      action: 'EXPORTED alice@example.com',
      subjectId: 'document-id',
      safeCounts: {},
      pluginVersion: '1.0.0',
    }).ok,
  ).toBe(false);
});
