import { err, error, ok, type Result } from './index.js';
import type { CandidateType, Handling } from './detection.js';

export type ReviewStatus = 'PENDING' | 'ACCEPTED' | 'IGNORED' | 'BLOCKED';
export interface ReviewOccurrence {
  readonly occurrenceId: string;
  readonly entityId: string;
  readonly handling: Handling | 'REDACT';
}
export interface ReviewEntity {
  readonly entityId: string;
  readonly type: CandidateType;
  readonly status: ReviewStatus;
  readonly handling: Handling | 'REDACT';
  readonly occurrenceIds: readonly string[];
}
export interface BatchPreview {
  readonly count: number;
  readonly examples: readonly string[];
}

const severity = (handling: Handling | 'REDACT') =>
  handling === 'BLOCK_EXPORT' ? 3 : handling === 'REDACT' ? 2 : 1;
const stricter = (a: Handling | 'REDACT', b: Handling | 'REDACT') =>
  severity(a) >= severity(b) ? a : b;

export function splitReviewEntity(
  entity: ReviewEntity,
  movedOccurrenceIds: readonly string[],
  newEntityId: string,
): Result<readonly [ReviewEntity, ReviewEntity]> {
  const moved = new Set(movedOccurrenceIds);
  if (
    !newEntityId ||
    moved.size === 0 ||
    ![...moved].every((id) => entity.occurrenceIds.includes(id))
  )
    return err(error('PB-CAND-004'));
  const remaining = entity.occurrenceIds.filter((id) => !moved.has(id));
  if (remaining.length === 0) return err(error('PB-CAND-004'));
  return ok([
    { ...entity, status: 'PENDING', occurrenceIds: remaining },
    { ...entity, entityId: newEntityId, status: 'PENDING', occurrenceIds: [...moved] },
  ]);
}

export function mergeReviewEntities(
  left: ReviewEntity,
  right: ReviewEntity,
  entityId: string,
  primaryType: CandidateType,
): Result<ReviewEntity> {
  if (!entityId || left.entityId === right.entityId) return err(error('PB-CAND-004'));
  const handling = stricter(left.handling, right.handling);
  return ok({
    entityId,
    type: primaryType,
    handling,
    status: handling === 'BLOCK_EXPORT' ? 'BLOCKED' : 'PENDING',
    occurrenceIds: [...new Set([...left.occurrenceIds, ...right.occurrenceIds])],
  });
}

export function applyEntityDecision(
  entity: ReviewEntity,
  status: Exclude<ReviewStatus, 'PENDING'>,
): ReviewEntity {
  return { ...entity, status: entity.handling === 'BLOCK_EXPORT' ? 'BLOCKED' : status };
}

export function reviewReady(entities: readonly ReviewEntity[]): boolean {
  return entities.every((entity) => entity.status !== 'PENDING' && entity.status !== 'BLOCKED');
}

export function previewBatchAction(
  entityIds: readonly string[],
  visibleExamples: readonly string[],
): BatchPreview {
  return { count: new Set(entityIds).size, examples: visibleExamples.slice(0, 3) };
}
