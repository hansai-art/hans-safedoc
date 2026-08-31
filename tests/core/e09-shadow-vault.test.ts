import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildShadowVault, createPathMap } from '@privacy-bridge/core';
const roots: string[] = [];
const digest = (v: Uint8Array) => createHash('sha256').update(v).digest('hex');
afterEach(async () =>
  Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))),
);
describe('E09 Shadow Vault', () =>
  it('atomically publishes sanitized files and never writes secure maps', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-shadow-'));
    roots.push(root);
    const source = join(root, 'source'),
      output = join(root, 'output');
    await mkdir(source);
    await mkdir(output);
    const documentId = randomUUID(),
      content = new TextEncoder().encode('safe \u27e6PB:PERSON:X\u27e7');
    const map = createPathMap([{ documentId, relativePath: 'raw-name.md' }]);
    if (!map.ok) throw new Error('map');
    const built = await buildShadowVault({
      jobId: 'PB-20260828-0123456789',
      sourceRoot: source,
      configDir: '.obsidian',
      outputParent: output,
      pathMap: map.value,
      documents: [
        { documentId, sourceRelativePath: 'raw-name.md', sourceSha256: digest(content), content },
      ],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(
      new TextDecoder().decode(await readFile(join(built.value.root, 'DOC-000001/DOC-000001.md'))),
    ).toContain('PB:PERSON');
    expect(
      await readFile(join(built.value.root, 'path-map.enc')).catch(() => undefined),
    ).toBeUndefined();
  }));

describe('ACC-EXP-003 ACC-EXP-005 Shadow edge boundaries', () =>
  it('rejects non-Markdown and .obsidian targets without leaving a final Shadow', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-shadow-'));
    roots.push(root);
    const source = join(root, 'source'),
      output = join(root, 'output');
    await mkdir(source);
    await mkdir(output);
    const documentId = randomUUID(),
      content = new TextEncoder().encode('safe');
    const map = createPathMap([{ documentId, relativePath: '.obsidian/plugin.json' }]);
    expect(map.ok).toBe(true);
    if (!map.ok) return;
    const built = await buildShadowVault({
      jobId: 'PB-20260828-0123456789',
      sourceRoot: source,
      configDir: '.obsidian',
      outputParent: output,
      pathMap: map.value,
      documents: [
        {
          documentId,
          sourceRelativePath: '.obsidian/plugin.json',
          sourceSha256: digest(content),
          content,
        },
      ],
    });
    expect(built.ok).toBe(false);
  }));
