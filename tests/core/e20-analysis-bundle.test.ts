import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSafePackage, parseResultPackage, validateSafePackage } from '@privacy-bridge/core';
import {
  createAnalysisBundle,
  verifyAnalysisHandoff,
} from '../../packages/obsidian-plugin/src/analysis-request.js';
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
    expect(bundle.handoff.status).toBe('SAFE_TO_UPLOAD');
    expect(bundle.handoff.checks.map((check) => check.code)).toEqual([
      'PACKAGE_VALID',
      'PAIR_MATCH',
      'RESULT_TEMPLATE_VALID',
      'MAPPING_EXCLUDED',
    ]);
    expect(
      verifyAnalysisHandoff(
        packageBytes,
        new TextEncoder().encode(JSON.stringify({ ...request, mapping: ['raw-value'] })),
        {
          jobId: prepared.value.jobId,
          packageHash: bundle.packageHash,
          documentId: prepared.value.documentId,
          addressPrivacyMode: prepared.value.addressPrivacyMode,
        },
      ).ok,
    ).toBe(false);
    expect(
      verifyAnalysisHandoff(
        packageBytes,
        new TextEncoder().encode(
          JSON.stringify({
            ...request,
            privacyPolicy: {
              addressMode: prepared.value.addressPrivacyMode,
              mapping: ['raw-value'],
            },
          }),
        ),
        {
          jobId: prepared.value.jobId,
          packageHash: bundle.packageHash,
          documentId: prepared.value.documentId,
          addressPrivacyMode: prepared.value.addressPrivacyMode,
        },
      ).ok,
    ).toBe(false);
    if (process.platform !== 'win32') {
      expect((await stat(bundle.safePackageFile)).mode & 0o777).toBe(0o600);
      expect((await stat(bundle.analysisRequestFile)).mode & 0o777).toBe(0o600);
    }
  });

  it('rejects a valid but differently bound Safe Package during handoff verification', async () => {
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
    const expected = buildSafePackage({
      jobId: prepared.value.jobId,
      pluginVersion: '1.4.0',
      rulesVersion: '1.4.0',
      sourceSnapshotHash: prepared.value.sourceSha256,
      createdAt: '2026-09-02T00:00:00.000Z',
      documents: [
        {
          documentId: prepared.value.documentId,
          relativePath: 'documents/doc-000001.txt',
          content: prepared.value.sanitizedContent,
        },
      ],
      entities: [],
      privacyPolicy: { addressMode: prepared.value.addressPrivacyMode },
    });
    const other = buildSafePackage({
      jobId: prepared.value.jobId,
      pluginVersion: '1.4.0',
      rulesVersion: '1.4.0',
      sourceSnapshotHash: prepared.value.sourceSha256,
      createdAt: '2026-09-02T00:00:00.000Z',
      documents: [
        {
          documentId: '11111111-1111-4111-8111-111111111111',
          relativePath: 'documents/doc-000001.txt',
          content: prepared.value.sanitizedContent,
        },
      ],
      entities: [],
      privacyPolicy: { addressMode: prepared.value.addressPrivacyMode },
    });
    if (!expected.ok || !other.ok) throw new Error('fixture build failed');
    const request = new TextEncoder().encode(
      JSON.stringify({
        schemaVersion: '1.0.0',
        jobId: prepared.value.jobId,
        sourcePackageHash: expected.value.packageHash,
        allowedDocumentIds: [prepared.value.documentId],
        resultSchema: 'result-package.schema.json',
        privacyPolicy: { addressMode: prepared.value.addressPrivacyMode },
        resultTemplate: {
          schemaVersion: '1.0.0',
          jobId: prepared.value.jobId,
          sourcePackageHash: expected.value.packageHash,
          createdAt: '2026-09-02T00:00:00.000Z',
          producer: 'replace-with-producer-name',
          findings: [],
        },
        findingContract: {
          findingId: 'UUIDv4',
          entityRefs: 'unique intact PB tokens used by this finding',
          category: '1-100 characters matching A-Za-z0-9._-',
          summary: 'plain text up to 20000 characters',
          sourceDocumentIds: [prepared.value.documentId],
          evidence: {
            documentId: prepared.value.documentId,
            excerpt: 'plain text up to 5000 characters',
          },
        },
        requirements: [
          'Return one UTF-8 JSON object only.',
          'Copy jobId and sourcePackageHash exactly.',
          'Use only listed document IDs and intact PB tokens from the Safe Package.',
          'Use UUIDv4 findingId values and include no extra properties.',
        ],
      }),
    );
    expect(
      verifyAnalysisHandoff(other.value.bytes, request, {
        jobId: prepared.value.jobId,
        packageHash: expected.value.packageHash,
        documentId: prepared.value.documentId,
        addressPrivacyMode: prepared.value.addressPrivacyMode,
      }).ok,
    ).toBe(false);
  });
});
