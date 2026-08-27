import { describe, expect, it } from 'vitest';
import { ClientSession, deriveScryptKey } from '@privacy-bridge/core';

describe('ACC-STR-008 passphrase persistence', () => {
  it('keeps passphrase-derived material only in the session and clears it on lock', async () => {
    const passphrase = 'correct horse battery staple';
    const session = new ClientSession();
    const key = await deriveScryptKey(passphrase, new Uint8Array(16));
    expect(session.unlock(key, 0).ok).toBe(true);
    session.lock();
    expect(session.requireKey(1).error?.code).toBe('PB-STORE-005');
    expect(JSON.stringify(session)).not.toContain(passphrase);
  });
});
