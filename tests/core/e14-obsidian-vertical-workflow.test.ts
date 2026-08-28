import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSyntheticDocumentWorkflow } from '../../packages/obsidian-plugin/src/workflow.js';

const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');

describe('Obsidian current-note vertical workflow', () => {
  it('scans synthetic data, writes a sanitized copy outside the source vault, and preserves source bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'privacy-bridge-ui-'));
    const vaultRoot = join(root, 'Source Vault');
    const outputParent = join(root, 'Privacy Bridge Outputs');
    const relativePath = 'Privacy Bridge Alpha 測試資料/Project-Aurora.md';
    const sourcePath = join(vaultRoot, relativePath);
    const source = [
      '# Project Aurora',
      '',
      '電話：0912-345-678',
      'Email：demo@example.invalid',
      '',
    ].join('\n');

    try {
      await mkdir(join(vaultRoot, 'Privacy Bridge Alpha 測試資料'), { recursive: true });
      await mkdir(outputParent, { recursive: true });
      await writeFile(sourcePath, source);
      const before = new Uint8Array(await readFile(sourcePath));

      const result = await runSyntheticDocumentWorkflow({
        vaultRoot,
        outputParent,
        relativePath,
        content: source,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.candidates.map((candidate) => candidate.primaryType)).toEqual(
        expect.arrayContaining(['TW_MOBILE', 'EMAIL']),
      );
      const output = await readFile(result.value.outputFile, 'utf8');
      expect(output).not.toContain('0912-345-678');
      expect(output).not.toContain('demo@example.invalid');
      expect(output).toMatch(/⟦PB:TW_MOBILE:/u);
      expect(output).toMatch(/⟦PB:EMAIL:/u);
      expect(sha256(new Uint8Array(await readFile(sourcePath)))).toBe(sha256(before));
      expect(result.value.sourceSha256).toBe(sha256(before));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed instead of exporting a document containing a detected secret', async () => {
    const root = await mkdtemp(join(tmpdir(), 'privacy-bridge-ui-secret-'));
    const vaultRoot = join(root, 'Source Vault');
    const outputParent = join(root, 'Privacy Bridge Outputs');
    try {
      await mkdir(vaultRoot);
      await mkdir(outputParent);
      const result = await runSyntheticDocumentWorkflow({
        vaultRoot,
        outputParent,
        relativePath: 'secret.md',
        content: 'password: correct-horse-battery-staple',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('PB-DEMO-SECRET-BLOCK');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
