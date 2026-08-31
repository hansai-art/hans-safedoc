import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInventory, createNodeSourceAdapter } from '@privacy-bridge/core';

describe('ACC-FND-003 source readonly job', () => {
  it('reads a fixture vault without changing source bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-readonly-'));
    const note = join(root, 'note.md');
    await writeFile(note, '# Client\n');
    const before = createHash('sha256')
      .update(await readFile(note))
      .digest('hex');
    const inventory = await createInventory(createNodeSourceAdapter(root, '.test-config'));
    expect(inventory.ok && inventory.value.documents).toHaveLength(1);
    expect(
      createHash('sha256')
        .update(await readFile(note))
        .digest('hex'),
    ).toBe(before);
    await rm(root, { recursive: true });
  });
});
