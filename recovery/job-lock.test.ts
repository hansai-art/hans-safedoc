import { describe, expect, it } from 'vitest';
import { acquireJobMutationLock, isStaleLock } from '@privacy-bridge/core';

describe('ACC-STR-012 mutation job lock', () => {
  it('denies a second operation and only recovers a journal-confirmed stale lock', () => {
    const current = {
      jobId: 'PB-20260828-0123456789',
      operationId: 'one',
      heartbeatAt: '2026-08-28T00:00:00.000Z',
    };
    expect(
      acquireJobMutationLock(current, { ...current, operationId: 'two' }, false).error?.code,
    ).toBe('PB-JOB-005');
    const stale = isStaleLock(current, new Date('2026-08-28T00:02:00Z'), false, false);
    expect(acquireJobMutationLock(current, { ...current, operationId: 'recovery' }, stale).ok).toBe(
      true,
    );
  });
});
