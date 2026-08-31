import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  prepareReviewedDocument,
  publishPreparedDocument,
  scanSyntheticDocument,
} from '../../packages/obsidian-plugin/src/workflow.js';

const configuredVault = process.env.PRIVACY_BRIDGE_SMOKE_VAULT;
const run = configuredVault ? describe : describe.skip;

run('installed synthetic demo smoke test', () => {
  it('writes a sanitized copy and preserves the installed source fixture', async () => {
    const vaultRoot = configuredVault!;
    const relativePath = 'Privacy Bridge Alpha 測試資料/Project-Aurora.md';
    const sourcePath = join(vaultRoot, relativePath);
    const outputParent = join(dirname(vaultRoot), 'Privacy Bridge Smoke Outputs');
    const before = new Uint8Array(await readFile(sourcePath));
    const beforeHash = createHash('sha256').update(before).digest('hex');

    try {
      const source = new TextDecoder().decode(before);
      const scanned = scanSyntheticDocument(source);
      expect(scanned.ok).toBe(true);
      if (!scanned.ok) return;
      expect(scanned.value).toHaveLength(20);
      const prepared = prepareReviewedDocument(
        source,
        scanned.value,
        Object.fromEntries(
          scanned.value.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
        ),
      );
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) return;
      expect(prepared.value.previewHunks).toHaveLength(10);
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
      const output = await readFile(result.value.outputFile, 'utf8');
      expect(output).not.toContain('0912-345-678');
      expect(output).not.toContain('aurora08@example.invalid');
      expect(output).toContain('⟦PB:TW_MOBILE:');
      expect(output).toContain('⟦PB:EMAIL:');
      const afterHash = createHash('sha256')
        .update(await readFile(sourcePath))
        .digest('hex');
      expect(afterHash).toBe(beforeHash);
    } finally {
      await rm(outputParent, { recursive: true, force: true });
    }
  });
});
