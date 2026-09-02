import { randomBytes } from 'node:crypto';
import { link, readFile, rm, writeFile } from 'node:fs/promises';
import {
  buildSafePackage,
  canonicalStringify,
  err,
  error,
  inspectSafePackage,
  ok,
  parseResultPackage,
  resultHash,
  type AddressPrivacyMode,
  type Result,
} from '@privacy-bridge/core';
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
  readonly handoff: SafeHandoffReport;
}

export interface SafeHandoffCheck {
  readonly code: 'PACKAGE_VALID' | 'PAIR_MATCH' | 'RESULT_TEMPLATE_VALID' | 'MAPPING_EXCLUDED';
  readonly label: string;
  readonly ok: true;
}

export interface SafeHandoffReport {
  readonly status: 'SAFE_TO_UPLOAD';
  readonly jobId: string;
  readonly packageHash: string;
  readonly addressPrivacyMode: AddressPrivacyMode;
  readonly checks: readonly SafeHandoffCheck[];
}

const ANALYSIS_REQUEST_KEYS = new Set([
  'schemaVersion',
  'jobId',
  'sourcePackageHash',
  'allowedDocumentIds',
  'resultSchema',
  'privacyPolicy',
  'resultTemplate',
  'findingContract',
  'requirements',
]);

const ANALYSIS_REQUIREMENTS = [
  'Return one UTF-8 JSON object only.',
  'Copy jobId and sourcePackageHash exactly.',
  'Use only listed document IDs and intact PB tokens from the Safe Package.',
  'Use UUIDv4 findingId values and include no extra properties.',
] as const;

function analysisFindingContract(documentId: string): Record<string, unknown> {
  return {
    findingId: 'UUIDv4',
    entityRefs: 'unique intact PB tokens used by this finding',
    category: '1-100 characters matching A-Za-z0-9._-',
    summary: 'plain text up to 20000 characters',
    sourceDocumentIds: [documentId],
    evidence: {
      documentId,
      excerpt: 'plain text up to 5000 characters',
    },
  };
}

export function verifyAnalysisHandoff(
  packageBytes: Uint8Array,
  requestBytes: Uint8Array,
  expected: {
    readonly jobId: string;
    readonly packageHash: string;
    readonly documentId: string;
    readonly addressPrivacyMode: AddressPrivacyMode;
  },
): Result<SafeHandoffReport> {
  const inspected = inspectSafePackage(packageBytes);
  if (!inspected.ok) return err(error('PB-EXPORT-005'));
  try {
    const request: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(requestBytes),
    );
    if (!request || typeof request !== 'object' || Array.isArray(request))
      return err(error('PB-EXPORT-005'));
    const value = request as Record<string, unknown>;
    const manifest = inspected.value.manifest;
    const files = manifest.files as readonly { documentId?: unknown }[];
    const packagePolicy = manifest.privacyPolicy as { addressMode?: unknown } | undefined;
    const allowed = value.allowedDocumentIds;
    const policy = value.privacyPolicy as { addressMode?: unknown } | undefined;
    const template = parseResultPackage(value.resultTemplate);
    if (
      Object.keys(value).length !== ANALYSIS_REQUEST_KEYS.size ||
      Object.keys(value).some((key) => !ANALYSIS_REQUEST_KEYS.has(key)) ||
      manifest.jobId !== expected.jobId ||
      manifest.packageHash !== expected.packageHash ||
      files.length !== 1 ||
      files[0]?.documentId !== expected.documentId ||
      packagePolicy?.addressMode !== expected.addressPrivacyMode ||
      value.jobId !== expected.jobId ||
      value.sourcePackageHash !== expected.packageHash ||
      !Array.isArray(allowed) ||
      allowed.length !== 1 ||
      allowed[0] !== expected.documentId ||
      value.schemaVersion !== '1.0.0' ||
      value.resultSchema !== 'result-package.schema.json' ||
      policy?.addressMode !== expected.addressPrivacyMode ||
      !template.ok ||
      template.value.jobId !== expected.jobId ||
      template.value.sourcePackageHash !== expected.packageHash ||
      template.value.producer !== 'replace-with-producer-name' ||
      !Array.isArray(template.value.findings) ||
      template.value.findings.length !== 0 ||
      canonicalStringify(value.findingContract) !==
        canonicalStringify(analysisFindingContract(expected.documentId)) ||
      canonicalStringify(value.requirements) !== canonicalStringify(ANALYSIS_REQUIREMENTS)
    )
      return err(error('PB-EXPORT-005'));
    return ok({
      status: 'SAFE_TO_UPLOAD',
      jobId: expected.jobId,
      packageHash: expected.packageHash,
      addressPrivacyMode: expected.addressPrivacyMode,
      checks: [
        { code: 'PACKAGE_VALID', label: 'Safe Package 結構、Checksum 與 Package Hash', ok: true },
        { code: 'PAIR_MATCH', label: 'Safe Package 與 analysis-request.json 配對', ok: true },
        { code: 'RESULT_TEMPLATE_VALID', label: 'Result JSON Schema 範本', ok: true },
        {
          code: 'MAPPING_EXCLUDED',
          label: 'Mapping、字典、密碼與 Token Key 未進入交接包',
          ok: true,
        },
      ],
    });
  } catch {
    return err(error('PB-EXPORT-005'));
  }
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
    pluginVersion: '1.4.0',
    rulesVersion: '1.4.0',
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
    privacyPolicy: { addressMode: input.prepared.addressPrivacyMode },
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
      privacyPolicy: { addressMode: input.prepared.addressPrivacyMode },
      resultTemplate: {
        schemaVersion: '1.0.0',
        jobId: input.prepared.jobId,
        sourcePackageHash: built.value.packageHash,
        createdAt,
        producer: 'replace-with-producer-name',
        findings: [],
      },
      findingContract: analysisFindingContract(input.prepared.documentId),
      requirements: ANALYSIS_REQUIREMENTS,
    })}\n`,
  );
  let packagePublished = false;
  let requestPublished = false;
  try {
    await publishVerified(safePackageFile, built.value.bytes);
    packagePublished = true;
    await publishVerified(analysisRequestFile, requestBytes);
    requestPublished = true;
    const handoff = verifyAnalysisHandoff(
      new Uint8Array(await readFile(safePackageFile)),
      new Uint8Array(await readFile(analysisRequestFile)),
      {
        jobId: input.prepared.jobId,
        packageHash: built.value.packageHash,
        documentId: input.prepared.documentId,
        addressPrivacyMode: input.prepared.addressPrivacyMode,
      },
    );
    if (!handoff.ok) throw new Error(`安全交接預檢失敗：${handoff.error.code}`);
    return {
      safePackageFile,
      analysisRequestFile,
      packageHash: built.value.packageHash,
      handoff: handoff.value,
    };
  } catch (cause) {
    if (packagePublished) await rm(safePackageFile, { force: true });
    if (requestPublished) await rm(analysisRequestFile, { force: true });
    throw cause;
  }
}
