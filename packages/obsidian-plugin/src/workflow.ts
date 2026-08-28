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

export type CandidateDecision = 'ACCEPTED' | 'IGNORED';
export type CandidateDecisions = Readonly<Record<string, CandidateDecision | undefined>>;

export interface PreparedReviewedDocument {
  readonly jobId: string;
  readonly candidates: readonly DetectedCandidate[];
  readonly sourceContent: string;
  readonly sanitizedContent: string;
  readonly previewChanges: readonly PreviewChange[];
  readonly sourceSha256: string;
  readonly documentId: string;
}

export interface PreviewChange {
  readonly candidateId: string;
  readonly type: string;
  readonly before: string;
  readonly after: string;
  readonly decision: CandidateDecision;
}

export interface PublishPreparedDocumentInput {
  readonly vaultRoot: string;
  readonly outputParent: string;
  readonly relativePath: string;
  readonly currentContent: string;
  readonly prepared: PreparedReviewedDocument;
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

export function prepareReviewedDocument(
  source: string,
  candidates: readonly DetectedCandidate[],
  decisions: CandidateDecisions,
): Result<PreparedReviewedDocument> {
  if (candidates.some((candidate) => candidate.handling === 'BLOCK_EXPORT'))
    return err(error('PB-DEMO-SECRET-BLOCK'));
  if (candidates.some((candidate) => decisions[candidate.candidateId] === undefined))
    return err(error('PB-REVIEW-001'));
  const accepted = candidates.filter(
    (candidate) =>
      candidate.handling === 'TOKENIZE' && decisions[candidate.candidateId] === 'ACCEPTED',
  );
  const jobId = createJobId();
  const assignments = assignEntityTokens(
    randomBytes(32),
    jobId,
    accepted.map((candidate) => ({
      type: candidate.primaryType,
      value: candidate.surfaceText,
    })),
  );
  const sanitized = tokenizeDocument(
    source,
    accepted.map((candidate, index) => ({
      start: candidate.start,
      end: candidate.end,
      sourceTextHash: candidate.sourceTextHash,
      token: assignments[index]!.token,
      handling: 'TOKENIZE' as const,
    })),
  );
  if (!sanitized.ok) return sanitized;
  const tokens = new Map(
    accepted.map((candidate, index) => [candidate.candidateId, assignments[index]!.token]),
  );
  return ok({
    jobId,
    candidates,
    sourceContent: source,
    sanitizedContent: sanitized.value,
    previewChanges: candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      type: candidate.primaryType,
      before: candidate.surfaceText,
      after: tokens.get(candidate.candidateId) ?? candidate.surfaceText,
      decision: decisions[candidate.candidateId]!,
    })),
    sourceSha256: sha256(source),
    documentId: assignments[0]?.entityId ?? sha256(source).slice(0, 16),
  });
}

/** Publishes only a reviewed preview and checks the source snapshot before any disk write. */
export async function publishPreparedDocument(
  input: PublishPreparedDocumentInput,
): Promise<Result<SyntheticDocumentWorkflowOutput>> {
  if (sha256(input.currentContent) !== input.prepared.sourceSha256)
    return err(error('PB-FILE-004'));
  const { documentId } = input.prepared;
  const pathMap = createPathMap([{ documentId, relativePath: input.relativePath }]);
  if (!pathMap.ok) return pathMap;

  await mkdir(input.outputParent, { recursive: true, mode: 0o700 });
  const content = new TextEncoder().encode(input.prepared.sanitizedContent);
  const shadow = await buildShadowVault({
    jobId: input.prepared.jobId,
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
    jobId: input.prepared.jobId,
    candidates: input.prepared.candidates,
    outputRoot: shadow.value.root,
    outputFile: join(shadow.value.root, file.relativePath),
    sourceSha256: input.prepared.sourceSha256,
  });
}
