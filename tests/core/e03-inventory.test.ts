import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createNodeSourceAdapter, createInventory } from '@privacy-bridge/core';

describe('E03 inventory', () => {
  it('inventories Markdown, blocks unsupported files, and excludes system paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-inventory-'));
    await mkdir(join(root, '.obsidian'));
    await writeFile(join(root, '.obsidian', 'app.json'), '{}');
    await writeFile(join(root, '.hidden.md'), '# hidden');
    await writeFile(join(root, 'note.md'), '# note');
    await writeFile(join(root, 'image.png'), 'x');
    const result = await createInventory(createNodeSourceAdapter(root));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.documents.map((item) => item.relativePath)).toEqual([
      '.hidden.md',
      'note.md',
    ]);
    expect(result.value.blockers).toContain('PB-FILE-001');
  });

  it('never follows symbolic links outside the source root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-inventory-'));
    const outside = await mkdtemp(join(tmpdir(), 'pb-outside-'));
    await writeFile(join(outside, 'secret.md'), 'secret');
    await symlink(outside, join(root, 'escape'));
    const result = await createInventory(createNodeSourceAdapter(root));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blockers).toContain('PB-FILE-003');
    expect(result.value.documents).toEqual([]);
  });
});
