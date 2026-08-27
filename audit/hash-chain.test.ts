import { expect, it } from 'vitest';
import { appendAudit, transitionJob, verifyAudit } from '@privacy-bridge/core';

it('ACC-OPS-002: delete, reorder or modify an audit event blocks the job', () => {
  const base = {
    timestamp: '2026-08-28T00:00:00.000Z',
    jobId: 'PB-20260828-0123456789',
    deviceId: 'device',
    operatorAliasFingerprint: 'fingerprint',
    action: 'EXPORT',
    subjectId: 'doc',
    safeCounts: {},
    pluginVersion: '1.0.0',
  };
  const first = appendAudit([], base);
  if (!first.ok) throw new Error('audit');
  const second = appendAudit([first.value], { ...base, action: 'IMPORT' });
  if (!second.ok) throw new Error('audit');
  expect(verifyAudit([second.value, first.value]).ok).toBe(false);
  expect(verifyAudit([{ ...first.value, action: 'ALTERED' }, second.value]).ok).toBe(false);
  expect(transitionJob('EXPORTED', 'BLOCKED')).toEqual({ ok: true, value: 'BLOCKED' });
});
