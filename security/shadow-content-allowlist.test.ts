import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { buildShadowVault, createPathMap } from '@privacy-bridge/core';

it('ACC-EXP-005: publishes only sanitized Markdown, never secure map or .obsidian content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pb-allowlist-'));
  try {
    const source = join(root, 'source'),
      output = join(root, 'output'),
      id = randomUUID(),
      bytes = new TextEncoder().encode('⟦PB:PERSON:X⟧');
    await Promise.all([mkdir(source), mkdir(output)]);
    const map = createPathMap([{ documentId: id, relativePath: 'canary-raw-name.md' }]);
    if (!map.ok) throw new Error('path map');
    const built = await buildShadowVault({
      jobId: 'PB-20260828-0123456789',
      sourceRoot: source,
      outputParent: output,
      pathMap: map.value,
      documents: [
        {
          documentId: id,
          sourceRelativePath: 'canary-raw-name.md',
          sourceSha256: createHash('sha256').update(bytes).digest('hex'),
          content: bytes,
        },
      ],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(await readdir(built.value.root)).toEqual(['DOC-000001']);
    expect(
      new TextDecoder().decode(
        await readFile(join(built.value.root, 'DOC-000001/canary-raw-name.md')),
      ),
    ).toContain('PB:PERSON');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
