import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInventory, createNodeSourceAdapter } from '@privacy-bridge/core';

describe('ACC-FIL-004 unsupported blocker', () => {
  it('lists PDF, image, office, and binary files as pending exclusions and blocks the scan', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-unsupported-'));
    await Promise.all(
      ['a.pdf', 'b.png', 'c.docx', 'd.bin'].map((name) => writeFile(join(root, name), 'x')),
    );
    const inventory = await createInventory(createNodeSourceAdapter(root, '.test-config'));
    expect(inventory.ok && inventory.value.unsupported).toEqual([
      'a.pdf',
      'b.png',
      'c.docx',
      'd.bin',
    ]);
    expect(inventory.ok && inventory.value.blockers).toContain('PB-FILE-001');
    await rm(root, { recursive: true });
  });
});
