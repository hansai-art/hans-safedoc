import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { buildShadowVault, createPathMap } from '@privacy-bridge/core';

it('ACC-EXP-003: rejected Shadow build leaves no partial final or staging directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pb-atomic-'));
  try {
    const source = join(root, 'source'),
      output = join(root, 'output'),
      id = randomUUID();
    await Promise.all([mkdir(source), mkdir(output)]);
    const map = createPathMap([{ documentId: id, relativePath: 'safe.md' }]);
    if (!map.ok) throw new Error('path map');
    const result = await buildShadowVault({
      jobId: 'PB-20260828-0123456789',
      sourceRoot: source,
      outputParent: output,
      pathMap: map.value,
      documents: [
        {
          documentId: id,
          sourceRelativePath: 'safe.md',
          sourceSha256: createHash('sha256').update('different').digest('hex'),
          content: new TextEncoder().encode('safe'),
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(await readdir(output)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
