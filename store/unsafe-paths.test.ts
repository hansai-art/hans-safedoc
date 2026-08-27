import { describe, expect, it } from 'vitest';
import { validateSecureStorePath } from '@privacy-bridge/core';

describe('ACC-STR-002 unsafe secure-store paths', () => {
  it('rejects Vault, Shadow, Result, sync, and network selections before a store can be created', () => {
    for (const input of [
      { candidate: '/vault', vaultRoot: '/vault' },
      { candidate: '/shadow', vaultRoot: '/vault', shadowRoots: ['/shadow'] },
      { candidate: '/result', vaultRoot: '/vault', resultRoots: ['/result'] },
      { candidate: '/sync', vaultRoot: '/vault', isSyncPath: true },
      { candidate: '//server/share', vaultRoot: '/vault', isNetworkMounted: true },
    ])
      expect(validateSecureStorePath(input).error?.code).toBe('PB-STORE-001');
  });
});
