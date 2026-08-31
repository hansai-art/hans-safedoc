import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInventory, createNodeSourceAdapter } from '@privacy-bridge/core';

describe('ACC-FIL-005 symlink boundary', () => {
  it('never follows a symlink escaping the source root and blocks the inventory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-link-'));
    const outside = await mkdtemp(join(tmpdir(), 'pb-outside-'));
    await writeFile(join(outside, 'secret.md'), 'secret');
    await symlink(outside, join(root, 'escape'));
    const inventory = await createInventory(createNodeSourceAdapter(root, '.test-config'));
    expect(inventory.ok && inventory.value.documents).toEqual([]);
    expect(inventory.ok && inventory.value.blockers).toContain('PB-FILE-003');
    await Promise.all([rm(root, { recursive: true }), rm(outside, { recursive: true })]);
  });
});
