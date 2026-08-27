import { appendAudit, type AuditEvent } from './audit.js';
import { err, error, ok, type Result } from './index.js';
import { applyEntityDecision, type ReviewEntity, type ReviewStatus } from './review-state.js';

export function visibleReviewEntities(
  entities: readonly (ReviewEntity & { readonly ruleScore: number })[],
  threshold: number,
  showAll: boolean,
): { readonly count: number; readonly visible: readonly ReviewEntity[] } {
  return {
    count: entities.length,
    visible: entities.filter((entity) => showAll || entity.ruleScore >= threshold),
  };
}

export interface BatchReviewResult {
  readonly entities: readonly ReviewEntity[];
  readonly audit: readonly AuditEvent[];
  readonly undo: () => readonly ReviewEntity[];
}

export function confirmBatchDecision(
  entities: readonly ReviewEntity[],
  entityIds: readonly string[],
  status: Exclude<ReviewStatus, 'PENDING'>,
  confirmed: boolean,
  now = '1970-01-01T00:00:00.000Z',
): Result<BatchReviewResult> {
  if (!confirmed) return err(error('PB-UX-003'));
  const selected = new Set(entityIds);
  if (selected.size === 0) return err(error('PB-UX-003'));
  const next = entities.map((entity) =>
    selected.has(entity.entityId) ? applyEntityDecision(entity, status) : entity,
  );
  const appended = appendAudit([], {
    timestamp: now,
    jobId: 'review-workflow',
    deviceId: 'local',
    operatorAliasFingerprint: 'batch',
    action: `BATCH_${status}`,
    subjectId: [...selected].sort().join(','),
    safeCounts: { entities: selected.size },
    pluginVersion: '1.0.0',
  });
  if (!appended.ok) return err(appended.error);
  return ok({ entities: next, audit: [appended.value], undo: () => entities });
}

export function invalidateReviewForVersionChange(
  entities: readonly ReviewEntity[],
): readonly ReviewEntity[] {
  return entities.map((entity) => ({ ...entity, status: 'PENDING' }));
}
