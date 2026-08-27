import { describe, expect, it } from 'vitest';
import { copyOnWriteMigrate, decideRecovery, isStaleLock } from '@privacy-bridge/core';

describe('E13 recovery and migration', () => {
  it('only marks a lock stale when heartbeat expired, process is absent, and device ownership is absent', () => {
    const lock = { heartbeatAt: '2026-08-28T00:00:00.000Z' };
    expect(isStaleLock(lock, new Date('2026-08-28T00:01:01.000Z'), false, false)).toBe(true);
    expect(isStaleLock(lock, new Date('2026-08-28T00:01:01.000Z'), true, false)).toBe(false);
    expect(isStaleLock(lock, new Date('2026-08-28T00:01:01.000Z'), false, true)).toBe(false);
  });

  it('defaults crashes to rollback and permits roll-forward only after verification', () => {
    expect(decideRecovery('SWAPPED', false)).toBe('ROLLBACK');
    expect(decideRecovery('POST_VALIDATION', true)).toBe('ROLLBACK');
    expect(decideRecovery('POST_VALIDATION', true, 'ROLL_FORWARD')).toBe('ROLL_FORWARD');
  });

  it('migrates copy-on-write, retaining a recovery snapshot when staging fails', () => {
    const before = new Map([['job.enc', new Uint8Array([1])]]);
    const failed = copyOnWriteMigrate(before, () => { throw new Error('bad'); });
    expect(failed.ok).toBe(false);
    expect(before.get('job.enc')).toEqual(new Uint8Array([1]));
    const migrated = copyOnWriteMigrate(before, (staging) => staging.set('job.enc', new Uint8Array([2])));
    expect(migrated.ok && migrated.value.active.get('job.enc')).toEqual(new Uint8Array([2]));
    expect(migrated.ok && migrated.value.recoverySnapshot.get('job.enc')).toEqual(new Uint8Array([1]));
  });
});
