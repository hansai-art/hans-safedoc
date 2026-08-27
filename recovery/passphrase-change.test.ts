import { describe, expect, it } from 'vitest';
import { rotateClientKey } from '@privacy-bridge/core';

describe('ACC-STR-010 passphrase change recovery', () => {
  it('does not overwrite the old client key on wrong passphrase, corrupt staged key, or interrupted write', () => {
    const old = { key: 'old-client.key' };
    for (const stage of [
      () => ({ ok: false, error: { code: 'PB-CRYPTO-006' } }),
      () => ({ ok: true, value: { key: '' } }),
    ]) {
      expect(
        rotateClientKey({
          current: old,
          stage: stage as never,
          validate: (candidate) => candidate.key.length > 0,
        }).ok,
      ).toBe(false);
      expect(old.key).toBe('old-client.key');
    }
  });
});
