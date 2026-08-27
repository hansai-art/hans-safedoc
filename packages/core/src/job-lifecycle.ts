import { err, error, ok, type Result } from './index.js';

export type JobState =
  | 'DRAFT'
  | 'INVENTORY_REQUIRED'
  | 'SCANNING'
  | 'REVIEW_REQUIRED'
  | 'READY_TO_BUILD'
  | 'BUILDING_SHADOW'
  | 'RESIDUAL_REVIEW'
  | 'READY_TO_EXPORT'
  | 'EXPORTED'
  | 'RESULT_IMPORTED'
  | 'READY_TO_RESTORE'
  | 'RESTORING'
  | 'RESTORED'
  | 'ARCHIVED'
  | 'BLOCKED'
  | 'FAILED';

const transitions: Readonly<Record<JobState, readonly JobState[]>> = {
  DRAFT: ['INVENTORY_REQUIRED', 'ARCHIVED'],
  INVENTORY_REQUIRED: ['SCANNING', 'DRAFT', 'BLOCKED', 'ARCHIVED'],
  SCANNING: ['REVIEW_REQUIRED', 'INVENTORY_REQUIRED', 'BLOCKED', 'FAILED'],
  REVIEW_REQUIRED: ['READY_TO_BUILD', 'SCANNING', 'BLOCKED', 'ARCHIVED'],
  READY_TO_BUILD: ['BUILDING_SHADOW', 'SCANNING', 'REVIEW_REQUIRED', 'BLOCKED', 'ARCHIVED'],
  BUILDING_SHADOW: ['RESIDUAL_REVIEW', 'SCANNING', 'BLOCKED', 'FAILED'],
  RESIDUAL_REVIEW: ['READY_TO_EXPORT', 'REVIEW_REQUIRED', 'SCANNING', 'BLOCKED'],
  READY_TO_EXPORT: ['EXPORTED', 'REVIEW_REQUIRED', 'SCANNING', 'BLOCKED'],
  EXPORTED: ['RESULT_IMPORTED', 'ARCHIVED', 'BLOCKED'],
  RESULT_IMPORTED: ['READY_TO_RESTORE', 'EXPORTED', 'BLOCKED'],
  READY_TO_RESTORE: ['RESTORING', 'RESULT_IMPORTED', 'BLOCKED'],
  RESTORING: ['RESTORED', 'READY_TO_RESTORE', 'FAILED', 'BLOCKED'],
  RESTORED: ['ARCHIVED', 'READY_TO_RESTORE'],
  ARCHIVED: ['DRAFT'],
  BLOCKED: ['SCANNING', 'REVIEW_REQUIRED', 'READY_TO_BUILD', 'ARCHIVED'],
  FAILED: ['INVENTORY_REQUIRED', 'SCANNING', 'BLOCKED'],
};

export function transitionJob(from: JobState, to: JobState): Result<JobState> {
  return transitions[from].includes(to) ? ok(to) : err(error('PB-JOB-003'));
}

/** A source change always invalidates review/build decisions and cannot publish Shadow. */
export function invalidateSourceSnapshot(state: JobState): Result<{
  state: 'SCANNING';
  publishShadow: false;
  stale: true;
}> {
  if (state === 'ARCHIVED') return err(error('PB-JOB-003'));
  return ok({ state: 'SCANNING', publishShadow: false, stale: true });
}

export interface JobMutationLock {
  readonly jobId: string;
  readonly operationId: string;
  readonly heartbeatAt: string;
}

export function acquireJobMutationLock(
  existing: JobMutationLock | undefined,
  next: JobMutationLock,
  stale: boolean,
): Result<JobMutationLock> {
  if (existing && !stale) return err(error('PB-JOB-005'));
  return ok(next);
}
