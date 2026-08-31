import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInventory, createNodeSourceAdapter } from '@privacy-bridge/core';

describe('ACC-FIL-008 rejected encoding', () => {
  it('blocks invalid UTF-8 without automatically converting it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-invalid-'));
    await writeFile(join(root, 'big5-or-invalid.md'), Buffer.from([0xff, 0xfe, 0x41]));
    const inventory = await createInventory(createNodeSourceAdapter(root, '.test-config'));
    expect(inventory.ok).toBe(false);
    if (!inventory.ok) expect(inventory.error.code).toBe('PB-FILE-002');
    await rm(root, { recursive: true });
  });
});
