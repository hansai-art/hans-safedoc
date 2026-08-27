import { describe, expect, it } from 'vitest';
import { appendAudit, verifyAudit } from '@privacy-bridge/core';
describe('E06 audit chain', () =>
  it('rejects tampering and raw sensitive fields', () => {
    const base = {
      timestamp: '2026-01-01T00:00:00.000Z',
      jobId: 'job',
      deviceId: 'device',
      operatorAliasFingerprint: 'fp',
      action: 'REVIEW_ACCEPT',
      subjectId: 'opaque',
      safeCounts: { count: 1 },
      pluginVersion: '1.0.0',
    };
    const first = appendAudit([], base);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(verifyAudit([{ ...first.value, action: 'password' }]).ok).toBe(false);
    expect(appendAudit([], { ...base, subjectId: 'a@b.com' }).ok).toBe(false);
  }));
