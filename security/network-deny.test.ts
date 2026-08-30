import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
import { openExternalReviewDocument } from '../packages/obsidian-plugin/src/external-format-workflow.js';
import { scanSyntheticDocument } from '../packages/obsidian-plugin/src/workflow.js';

describe('ACC-FND-007 denied network workflow', () => {
  it('runs product detection while socket APIs are denied', () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error('network forbidden');
    }) as typeof fetch;
    try {
      expect(detectAll('email: local@example.test').ok).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('opens and scans MD, TXT, and CSV without any fetch request', async () => {
    const original = globalThis.fetch;
    const requests: string[] = [];
    globalThis.fetch = ((input: string | URL | Request) => {
      requests.push(String(input));
      throw new Error('network forbidden');
    }) as typeof fetch;
    const root = await mkdtemp(join(tmpdir(), 'hsd-network-deny-'));
    try {
      expect(scanSyntheticDocument('email: local@example.test').ok).toBe(true);
      const txt = join(root, 'source.txt');
      const csv = join(root, 'source.csv');
      await writeFile(txt, '電話：0912-345-678\n');
      await writeFile(csv, 'name,email\n測試,local@example.test\n');
      expect((await openExternalReviewDocument(txt)).status).toBe('READY');
      expect((await openExternalReviewDocument(csv)).status).toBe('READY');
      expect(requests).toEqual([]);
    } finally {
      globalThis.fetch = original;
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects a final bundle that computes a fetch URL dynamically', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hsd-network-probe-'));
    try {
      const dist = join(root, 'packages/obsidian-plugin/dist');
      await mkdir(dist, { recursive: true });
      await writeFile(
        join(dist, 'main.js'),
        'const url=globalThis.__remote;globalThis.fetch(url);',
      );
      const result = spawnSync(
        process.execPath,
        [join(import.meta.dirname, '../scripts/network-scan.mjs'), root],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('globalThis.fetch');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
