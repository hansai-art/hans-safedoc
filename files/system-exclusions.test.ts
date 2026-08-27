import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInventory, createNodeSourceAdapter } from '@privacy-bridge/core';

describe('ACC-FIL-002 system exclusions', () => {
  it('excludes fixed system directories and audits only their relative names', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-system-'));
    for (const name of ['.obsidian', '.trash', '.git', 'privacy-bridge staging']) {
      await mkdir(join(root, name));
      await writeFile(join(root, name, 'hidden.md'), '# hidden');
    }
    const inventory = await createInventory(createNodeSourceAdapter(root));
    expect(inventory.ok && inventory.value.excluded).toEqual([
      '.git',
      '.obsidian',
      '.trash',
      'privacy-bridge staging',
    ]);
    expect(JSON.stringify(inventory)).not.toContain(root);
    await rm(root, { recursive: true });
  });
});
