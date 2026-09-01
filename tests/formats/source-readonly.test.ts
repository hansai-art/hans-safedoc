import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openReadOnlySource, SourceChangedError } from '@privacy-bridge/document-formats';

describe('read-only source', () => {
  it('rejects a source above the configured byte limit before returning bytes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hsd-source-limit-'));
    const path = join(dir, 'result.json');
    await writeFile(path, '12345');
    await expect(openReadOnlySource(path, { maxBytes: 4 })).rejects.toThrow(
      'Source is not a permitted regular file.',
    );
  });

  it('exposes reads only and preserves bytes, size and mtime', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hsd-source-'));
    const path = join(dir, 'source.txt');
    await writeFile(path, '王測試');
    const before = await stat(path);
    const source = await openReadOnlySource(path);
    expect('write' in source || 'rename' in source || 'delete' in source).toBe(false);
    expect(await source.read()).toEqual(await readFile(path));
    await source.recheck('after-extraction');
    const after = await stat(path);
    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  it('fails every recheck point when source bytes change', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hsd-source-change-'));
    for (const point of [
      'after-extraction',
      'before-rewrite',
      'before-staging-write',
      'before-publish',
    ] as const) {
      const path = join(dir, `${point}.txt`);
      await writeFile(path, 'before');
      const source = await openReadOnlySource(path);
      await writeFile(path, 'after!');
      await expect(source.recheck(point)).rejects.toBeInstanceOf(SourceChangedError);
    }
  });
});
