import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInventory, createNodeSourceAdapter } from '@privacy-bridge/core';

describe('ACC-FIL-003 hidden Markdown', () => {
  it('includes hidden user Markdown that is not a fixed system exclusion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-hidden-'));
    await mkdir(join(root, '.notes'));
    await writeFile(join(root, '.notes', 'private.md'), '# valid');
    const inventory = await createInventory(createNodeSourceAdapter(root, '.test-config'));
    expect(inventory.ok && inventory.value.documents.map((d) => d.relativePath)).toEqual([
      '.notes/private.md',
    ]);
    await rm(root, { recursive: true });
  });
});
