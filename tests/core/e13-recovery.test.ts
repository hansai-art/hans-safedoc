import { describe, expect, it } from 'vitest';
import {
  copyOnWriteMigrate,
  createPbJobBackup,
  decideRecovery,
  importPbJobBackup,
  isStaleLock,
} from '@privacy-bridge/core';

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
    const failed = copyOnWriteMigrate(before, () => {
      throw new Error('bad');
    });
    expect(failed.ok).toBe(false);
    expect(before.get('job.enc')).toEqual(new Uint8Array([1]));
    const migrated = copyOnWriteMigrate(before, (staging) =>
      staging.set('job.enc', new Uint8Array([2])),
    );
    expect(migrated.ok && migrated.value.active.get('job.enc')).toEqual(new Uint8Array([2]));
    expect(migrated.ok && migrated.value.recoverySnapshot.get('job.enc')).toEqual(
      new Uint8Array([1]),
    );
  });

  it('creates a self-validating encrypted .pbjob and imports only after full validation', async () => {
    const backup = await createPbJobBackup({
      jobId: 'PB-20260828-0123456789',
      pluginVersion: '1.0.0',
      createdAt: '2026-08-28T00:00:00.000Z',
      backupPassphrase: 'correct horse battery staple',
      backupPassphraseConfirmation: 'correct horse battery staple',
      jobRootKey: new Uint8Array(32).fill(7),
      records: [{ relativePath: 'job/mapping.enc', bytes: new Uint8Array([1, 2, 3]) }],
    });
    expect(backup.ok).toBe(true);
    if (!backup.ok) return;
    expect(new TextDecoder().decode(backup.value.bytes)).not.toContain(
      'correct horse battery staple',
    );
    const imported = await importPbJobBackup(backup.value.bytes, 'correct horse battery staple');
    expect(imported.ok && imported.value.records[0]?.bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('rejects wrong backup passphrases, tampering, and zip-slip entries before exposing records', async () => {
    const input = {
      jobId: 'PB-20260828-0123456789',
      pluginVersion: '1.0.0',
      createdAt: '2026-08-28T00:00:00.000Z',
      backupPassphrase: 'correct horse battery staple',
      backupPassphraseConfirmation: 'correct horse battery staple',
      jobRootKey: new Uint8Array(32).fill(7),
      records: [{ relativePath: 'job/job.enc', bytes: new Uint8Array([1]) }],
    } as const;
    const backup = await createPbJobBackup(input);
    expect(backup.ok).toBe(true);
    if (!backup.ok) return;
    expect((await importPbJobBackup(backup.value.bytes, 'wrong passphrase value')).ok).toBe(false);
    const tampered = new Uint8Array(backup.value.bytes);
    tampered[40] = tampered[40]! ^ 1;
    expect((await importPbJobBackup(tampered, input.backupPassphrase)).ok).toBe(false);
    const zipSlip = new Uint8Array(backup.value.bytes);
    const needle = new TextEncoder().encode('job/job.enc');
    const at = zipSlip.findIndex((_, offset) =>
      needle.every((byte, i) => zipSlip[offset + i] === byte),
    );
    zipSlip.set(new TextEncoder().encode('../evil.enc'), at);
    expect((await importPbJobBackup(zipSlip, input.backupPassphrase)).ok).toBe(false);
  });

  it('covers every crash journal phase with rollback by default', () => {
    for (const phase of [
      'PREPARED',
      'WRITING_TEMP',
      'TEMP_VALIDATED',
      'SWAP_PENDING',
      'SWAPPED',
      'POST_VALIDATION',
      'ROLLBACK_PENDING',
      'ROLLED_BACK',
    ] as const)
      expect(decideRecovery(phase, false)).toBe('ROLLBACK');
    expect(decideRecovery('SWAPPED', true, 'ROLL_FORWARD')).toBe('ROLL_FORWARD');
    expect(decideRecovery('COMMITTED', true)).toBe('CLEANUP');
  });
});
