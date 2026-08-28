import { createHash, randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  assignEntityTokens,
  buildShadowVault,
  createPathMap,
  detectAll,
  err,
  error,
  ok,
  tokenizeDocument,
  type DetectedCandidate,
  type Result,
} from '@privacy-bridge/core';

export interface SyntheticDocumentWorkflowInput {
  readonly vaultRoot: string;
  readonly outputParent: string;
  readonly relativePath: string;
  readonly content: string;
}

export interface SyntheticDocumentWorkflowOutput {
  readonly jobId: string;
  readonly candidates: readonly DetectedCandidate[];
  readonly outputRoot: string;
  readonly outputFile: string;
  readonly sourceSha256: string;
}

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function createJobId(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = [...randomBytes(5)].map((byte) => String(byte % 10)).join('');
  return `PB-${date}-${suffix}`;
}

export function scanSyntheticDocument(content: string): Result<readonly DetectedCandidate[]> {
  return detectAll(content);
}

/**
 * Alpha-only vertical slice for synthetic onboarding data.
 * It keeps the source Vault read-only and publishes only a sanitized Markdown copy outside it.
 */
export async function runSyntheticDocumentWorkflow(
  input: SyntheticDocumentWorkflowInput,
): Promise<Result<SyntheticDocumentWorkflowOutput>> {
  const detected = scanSyntheticDocument(input.content);
  if (!detected.ok) return detected;
  if (detected.value.some((candidate) => candidate.handling === 'BLOCK_EXPORT'))
    return err(error('PB-DEMO-SECRET-BLOCK'));

  const candidates = detected.value.filter((candidate) => candidate.handling === 'TOKENIZE');
  const jobId = createJobId();
  const assignments = assignEntityTokens(
    randomBytes(32),
    jobId,
    candidates.map((candidate) => ({
      type: candidate.primaryType,
      value: candidate.surfaceText,
    })),
  );
  const sanitized = tokenizeDocument(
    input.content,
    candidates.map((candidate, index) => ({
      start: candidate.start,
      end: candidate.end,
      sourceTextHash: candidate.sourceTextHash,
      token: assignments[index]!.token,
      handling: 'TOKENIZE' as const,
    })),
  );
  if (!sanitized.ok) return sanitized;

  const documentId =
    assignments[0]?.entityId ??
    createHash('sha256').update(input.relativePath).digest('hex').slice(0, 16);
  const pathMap = createPathMap([{ documentId, relativePath: input.relativePath }]);
  if (!pathMap.ok) return pathMap;

  await mkdir(input.outputParent, { recursive: true, mode: 0o700 });
  const content = new TextEncoder().encode(sanitized.value);
  const shadow = await buildShadowVault({
    jobId,
    sourceRoot: input.vaultRoot,
    outputParent: input.outputParent,
    documents: [
      {
        documentId,
        sourceRelativePath: input.relativePath,
        sourceSha256: createHash('sha256').update(content).digest('hex'),
        content,
      },
    ],
    pathMap: pathMap.value,
  });
  if (!shadow.ok) return shadow;
  const file = shadow.value.files[0];
  if (!file) return err(error('PB-EXPORT-003'));

  return ok({
    jobId,
    candidates,
    outputRoot: shadow.value.root,
    outputFile: join(shadow.value.root, file.relativePath),
    sourceSha256: sha256(input.content),
  });
}
