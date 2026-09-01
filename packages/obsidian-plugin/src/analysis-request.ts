import { randomBytes } from 'node:crypto';
import { link, readFile, rm, writeFile } from 'node:fs/promises';
import { buildSafePackage, canonicalStringify, resultHash } from '@privacy-bridge/core';
import type { PreparedReviewedDocument } from './workflow.js';

export interface AnalysisBundleInput {
  readonly outputFile: string;
  readonly prepared: PreparedReviewedDocument;
  readonly createdAt?: string;
}

export interface AnalysisBundle {
  readonly safePackageFile: string;
  readonly analysisRequestFile: string;
  readonly packageHash: string;
}

async function publishVerified(path: string, bytes: Uint8Array): Promise<void> {
  const staging = `${path}.${randomBytes(8).toString('hex')}.tmp`;
  let published = false;
  try {
    await writeFile(staging, bytes, { mode: 0o600, flag: 'wx' });
    await link(staging, path);
    published = true;
    await rm(staging, { force: true });
    if (resultHash(new Uint8Array(await readFile(path))) !== resultHash(bytes))
      throw new Error('分析資料重新驗證失敗。');
  } catch (cause) {
    await rm(staging, { force: true });
    if (published) await rm(path, { force: true });
    throw cause;
  }
}

/** Builds a mapping-free Safe Package plus the non-sensitive Result binding request. */
export async function createAnalysisBundle(input: AnalysisBundleInput): Promise<AnalysisBundle> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const built = buildSafePackage({
    jobId: input.prepared.jobId,
    pluginVersion: '1.3.0',
    rulesVersion: '1.3.0',
    sourceSnapshotHash: input.prepared.sourceSha256,
    createdAt,
    documents: [
      {
        documentId: input.prepared.documentId,
        relativePath: 'documents/doc-000001.txt',
        content: input.prepared.sanitizedContent,
      },
    ],
    entities: input.prepared.mapping.map((entity) => ({
      token: entity.token,
      type: entity.type,
      documentIds: [input.prepared.documentId],
    })),
  });
  if (!built.ok) throw new Error(`Safe Package 建立失敗：${built.error.code}`);

  const safePackageFile = `${input.outputFile}.safe-package.zip`;
  const analysisRequestFile = `${safePackageFile}.analysis-request.json`;
  const requestBytes = new TextEncoder().encode(
    `${canonicalStringify({
      schemaVersion: '1.0.0',
      jobId: input.prepared.jobId,
      sourcePackageHash: built.value.packageHash,
      allowedDocumentIds: [input.prepared.documentId],
      resultSchema: 'result-package.schema.json',
      resultTemplate: {
        schemaVersion: '1.0.0',
        jobId: input.prepared.jobId,
        sourcePackageHash: built.value.packageHash,
        createdAt,
        producer: 'replace-with-producer-name',
        findings: [],
      },
      findingContract: {
        findingId: 'UUIDv4',
        entityRefs: 'unique intact PB tokens used by this finding',
        category: '1-100 characters matching A-Za-z0-9._-',
        summary: 'plain text up to 20000 characters',
        sourceDocumentIds: [input.prepared.documentId],
        evidence: {
          documentId: input.prepared.documentId,
          excerpt: 'plain text up to 5000 characters',
        },
      },
      requirements: [
        'Return one UTF-8 JSON object only.',
        'Copy jobId and sourcePackageHash exactly.',
        'Use only listed document IDs and intact PB tokens from the Safe Package.',
        'Use UUIDv4 findingId values and include no extra properties.',
      ],
    })}\n`,
  );
  let packagePublished = false;
  let requestPublished = false;
  try {
    await publishVerified(safePackageFile, built.value.bytes);
    packagePublished = true;
    await publishVerified(analysisRequestFile, requestBytes);
    requestPublished = true;
    return { safePackageFile, analysisRequestFile, packageHash: built.value.packageHash };
  } catch (cause) {
    if (packagePublished) await rm(safePackageFile, { force: true });
    if (requestPublished) await rm(analysisRequestFile, { force: true });
    throw cause;
  }
}
