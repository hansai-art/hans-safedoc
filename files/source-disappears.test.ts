import { describe, expect, it } from 'vitest';
import { createInventory, type SourceAdapter } from '@privacy-bridge/core';

describe('ACC-FIL-012 source disappears', () => {
  it('returns a safe file error and no partial plaintext inventory when a source read fails', async () => {
    const adapter: SourceAdapter = {
      root: '/fixture',
      list: async () => ['missing.md'],
      stat: async () => ({ isDirectory: false, isSymbolicLink: false, size: 4, mtimeMs: 0 }),
      readBytes: async () => {
        throw new Error('EACCES');
      },
      realpath: async (path) => path,
    };
    const inventory = await createInventory(adapter);
    expect(inventory.ok).toBe(false);
    if (!inventory.ok) expect(inventory.error.code).toBe('PB-FILE-002');
  });
});
