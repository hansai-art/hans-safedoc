import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseResultPackage, validateSafePackage } from '@privacy-bridge/core';
import { createAnalysisBundle } from '../../packages/obsidian-plugin/src/analysis-request.js';
import {
  prepareReviewedDocument,
  scanSyntheticDocument,
} from '../../packages/obsidian-plugin/src/workflow.js';

describe('E20 analysis Safe Package bundle', () => {
  it('binds one mapping-free Safe Package to a non-sensitive analysis request', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hans-safedoc-analysis-'));
    const outputFile = join(root, 'hans-safedoc-test.md');
    const source = '電話：0912-345-678';
    const scanned = scanSyntheticDocument(source);
    if (!scanned.ok) throw new Error(scanned.error.code);
    const prepared = prepareReviewedDocument(
      source,
      scanned.value,
      Object.fromEntries(
        scanned.value.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
      ),
    );
    if (!prepared.ok) throw new Error(prepared.error.code);
    await writeFile(outputFile, prepared.value.sanitizedContent, 'utf8');

    const bundle = await createAnalysisBundle({
      outputFile,
      prepared: prepared.value,
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    const packageBytes = new Uint8Array(await readFile(bundle.safePackageFile));
    expect(validateSafePackage(packageBytes).ok).toBe(true);
    expect(new TextDecoder().decode(packageBytes)).not.toContain('0912-345-678');
    expect(new TextDecoder().decode(packageBytes)).not.toContain('preferredDisplay');
    const request = JSON.parse(await readFile(bundle.analysisRequestFile, 'utf8')) as {
      jobId: string;
      sourcePackageHash: string;
      allowedDocumentIds: string[];
      resultTemplate: Record<string, unknown>;
    };
    expect(request).toMatchObject({
      jobId: prepared.value.jobId,
      sourcePackageHash: bundle.packageHash,
      allowedDocumentIds: [prepared.value.documentId],
      resultTemplate: { schemaVersion: '1.0.0', findings: [] },
    });
    expect(parseResultPackage(request.resultTemplate).ok).toBe(true);
    if (process.platform !== 'win32') {
      expect((await stat(bundle.safePackageFile)).mode & 0o777).toBe(0o600);
      expect((await stat(bundle.analysisRequestFile)).mode & 0o777).toBe(0o600);
    }
  });
});
