import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInventory, createNodeSourceAdapter } from '@privacy-bridge/core';

describe('ACC-FIL-006 nested vault boundary', () => {
  it('does not traverse a directory recognized as a nested .obsidian vault', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-nested-'));
    await mkdir(join(root, 'nested', '.obsidian'), { recursive: true });
    await writeFile(join(root, 'nested', 'secret.md'), '# nested');
    const inventory = await createInventory(createNodeSourceAdapter(root, '.obsidian'));
    expect(inventory.ok && inventory.value.documents).toEqual([]);
    await rm(root, { recursive: true });
  });
});
