import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createScopedInventory } from '@privacy-bridge/core';

describe('ACC-FIL-001 source modes', () => {
  it('inventories active note, folder, whole Vault, and external folder deterministically', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-modes-'));
    const folder = join(root, 'folder');
    const external = await mkdtemp(join(tmpdir(), 'pb-external-'));
    await mkdir(folder);
    await Promise.all([
      writeFile(join(root, 'root.md'), '# root'),
      writeFile(join(folder, 'child.md'), '# child'),
      writeFile(join(external, 'external.md'), '# external'),
    ]);
    const active = await createScopedInventory(
      root,
      { kind: 'ACTIVE_NOTE', path: join(root, 'root.md') },
      '.test-config',
    );
    const folderInventory = await createScopedInventory(
      root,
      { kind: 'FOLDER', path: folder },
      '.test-config',
    );
    const whole = await createScopedInventory(root, { kind: 'WHOLE_VAULT' }, '.test-config');
    const outside = await createScopedInventory(
      root,
      { kind: 'EXTERNAL_FOLDER', path: external },
      '.test-config',
    );
    expect(active.ok && active.value.documents.map((d) => d.relativePath)).toEqual(['root.md']);
    expect(
      folderInventory.ok && folderInventory.value.documents.map((d) => d.relativePath),
    ).toEqual(['child.md']);
    expect(whole.ok && whole.value.documents.map((d) => d.relativePath)).toEqual([
      'folder/child.md',
      'root.md',
    ]);
    expect(outside.ok && outside.value.documents.map((d) => d.relativePath)).toEqual([
      'external.md',
    ]);
    await Promise.all([rm(root, { recursive: true }), rm(external, { recursive: true })]);
  });
});
