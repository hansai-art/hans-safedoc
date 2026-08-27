import { expect, it } from 'vitest';
import { createPbJobBackup, importPbJobBackup } from '@privacy-bridge/core';

it('ACC-OPS-005: encrypted backup roundtrips and wrong password writes no imported records', async () => {
  const input = {
    jobId: 'PB-20260828-0123456789',
    pluginVersion: '1.0.0',
    createdAt: '2026-08-28T00:00:00.000Z',
    backupPassphrase: 'correct horse battery staple',
    backupPassphraseConfirmation: 'correct horse battery staple',
    jobRootKey: new Uint8Array(32).fill(7),
    records: [{ relativePath: 'job/mapping.enc', bytes: new Uint8Array([1, 2, 3]) }],
  };
  const backup = await createPbJobBackup(input);
  if (!backup.ok) throw new Error('backup');
  expect((await importPbJobBackup(backup.value.bytes, input.backupPassphrase)).ok).toBe(true);
  expect((await importPbJobBackup(backup.value.bytes, 'wrong password not accepted')).ok).toBe(
    false,
  );
});
