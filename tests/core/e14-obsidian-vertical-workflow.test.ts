import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  prepareReviewedDocument,
  publishPreparedDocument,
  scanSyntheticDocument,
} from '../../packages/obsidian-plugin/src/workflow.js';

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

      const scanned = scanSyntheticDocument(source);
      expect(scanned.ok).toBe(true);
      if (!scanned.ok) return;
      expect(prepareReviewedDocument(source, scanned.value, {}).ok).toBe(false);
      const decisions = Object.fromEntries(
        scanned.value.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
      );
      const prepared = prepareReviewedDocument(source, scanned.value, decisions);
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) return;
      const result = await publishPreparedDocument({
        vaultRoot,
        configDir: '.test-config',
        outputParent,
        relativePath,
        currentContent: source,
        prepared: prepared.value,
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
      const source = 'password: correct-horse-battery-staple';
      const scanned = scanSyntheticDocument(source);
      expect(scanned.ok).toBe(true);
      if (!scanned.ok) return;
      const prepared = prepareReviewedDocument(source, scanned.value, {});
      expect(prepared.ok).toBe(false);
      if (!prepared.ok) expect(prepared.error.code).toBe('PB-DEMO-SECRET-BLOCK');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('replaces only accepted candidates and fails before disk writes if the source changed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'privacy-bridge-review-'));
    const vaultRoot = join(root, 'Source Vault');
    const outputParent = join(root, 'Privacy Bridge Outputs');
    const source = '電話：0912-345-678\nEmail：demo@example.invalid\n';
    try {
      await mkdir(vaultRoot);
      const scanned = scanSyntheticDocument(source);
      expect(scanned.ok).toBe(true);
      if (!scanned.ok) return;
      const decisions = Object.fromEntries(
        scanned.value.map((candidate) => [
          candidate.candidateId,
          candidate.primaryType === 'TW_MOBILE' ? 'ACCEPTED' : 'IGNORED',
        ]),
      ) as Record<string, 'ACCEPTED' | 'IGNORED'>;
      const prepared = prepareReviewedDocument(source, scanned.value, decisions);
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) return;
      expect(prepared.value.sanitizedContent).not.toContain('0912-345-678');
      expect(prepared.value.sanitizedContent).toContain('demo@example.invalid');
      expect(prepared.value.sourceContent).toBe(source);
      expect(prepared.value.previewChanges).toEqual([
        expect.objectContaining({
          type: 'TW_MOBILE',
          before: '0912-345-678',
          after: expect.stringMatching(/^⟦PB:TW_MOBILE:/u),
          decision: 'ACCEPTED',
        }),
        expect.objectContaining({
          type: 'EMAIL',
          before: 'demo@example.invalid',
          after: 'demo@example.invalid',
          decision: 'IGNORED',
        }),
      ]);
      expect(prepared.value.previewHunks).toEqual([
        expect.objectContaining({
          lineNumber: 1,
          collapsedBefore: 0,
          beforeLine: '電話：0912-345-678',
          afterLine: expect.stringMatching(/^電話：⟦PB:TW_MOBILE:/u),
          displayAfterLine: '電話：⟦手機代碼 01⟧',
        }),
      ]);

      const published = await publishPreparedDocument({
        vaultRoot,
        configDir: '.test-config',
        outputParent,
        relativePath: 'review.md',
        currentContent: `${source}changed`,
        prepared: prepared.value,
      });
      expect(published.ok).toBe(false);
      if (!published.ok) expect(published.error.code).toBe('PB-FILE-004');
      await expect(readFile(outputParent)).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
