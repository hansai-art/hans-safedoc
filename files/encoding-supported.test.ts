import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInventory, createNodeSourceAdapter } from '@privacy-bridge/core';

describe('ACC-FIL-007 supported encodings', () => {
  it('records UTF-8 BOM and line-ending metadata for LF and CRLF documents', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-encoding-'));
    await Promise.all([
      writeFile(join(root, 'lf.md'), 'one\ntwo\n'),
      writeFile(join(root, 'bom.md'), Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x0d, 0x0a])),
    ]);
    const inventory = await createInventory(createNodeSourceAdapter(root));
    expect(
      inventory.ok &&
        inventory.value.documents.map(({ relativePath, bom, lineEnding }) => ({
          relativePath,
          bom,
          lineEnding,
        })),
    ).toEqual([
      { relativePath: 'bom.md', bom: true, lineEnding: 'CRLF' },
      { relativePath: 'lf.md', bom: false, lineEnding: 'LF' },
    ]);
    await rm(root, { recursive: true });
  });
});
