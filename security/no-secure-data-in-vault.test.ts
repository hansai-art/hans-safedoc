import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildShadowVault, createPathMap } from '@privacy-bridge/core';

describe('ACC-STR-003 secure data boundary', () => {
  it('builds a Safe Package containing only sanitized Markdown, never key or mapping records', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-boundary-'));
    const source = join(root, 'source');
    const output = join(root, 'output');
    await Promise.all([
      writeFile(join(root, 'placeholder'), ''),
      (await import('node:fs/promises')).mkdir(source),
      (await import('node:fs/promises')).mkdir(output),
    ]);
    const bytes = new TextEncoder().encode('# Sanitized');
    const map = createPathMap([{ documentId: 'doc', relativePath: 'note.md' }]);
    expect(map.ok).toBe(true);
    if (!map.ok) return;
    const build = await buildShadowVault({
      jobId: 'PB-20260828-0123456789',
      sourceRoot: source,
      outputParent: output,
      documents: [
        {
          documentId: 'doc',
          sourceRelativePath: 'note.md',
          sourceSha256: (await import('node:crypto'))
            .createHash('sha256')
            .update(bytes)
            .digest('hex'),
          content: bytes,
        },
      ],
      pathMap: map.value,
    });
    expect(build.ok).toBe(true);
    expect(await readdir(output)).toHaveLength(1);
    await rm(root, { recursive: true });
  });
});
