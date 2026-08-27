import { describe, expect, it } from 'vitest';
import {
  ClientSession,
  acquireJobMutationLock,
  defaultSecureStorePath,
  invalidateSourceSnapshot,
  mergeReviewEntities,
  previewBatchAction,
  reviewReady,
  rotateClientKey,
  splitReviewEntity,
  transitionJob,
  validateSecureStorePath,
} from '@privacy-bridge/core';

describe('Secure Store and Client/Job lifecycle', () => {
  it('ACC-STR-001 ACC-STR-002 chooses an OS application-data default and rejects Vault/output/network paths', () => {
    expect(defaultSecureStorePath('darwin', '/Users/test')).toBe(
      '/Users/test/Library/Application Support/Privacy Bridge',
    );
    expect(defaultSecureStorePath('win32', 'C:\\Users\\test')).toBe(
      'C:\\Users\\test/AppData/Roaming/Privacy Bridge',
    );
    for (const candidate of ['/vault', '/vault/shadow', '/result'])
      expect(
        validateSecureStorePath({ candidate, vaultRoot: '/vault', resultRoots: ['/result'] }).ok,
      ).toBe(false);
    expect(validateSecureStorePath({ candidate: '//server/share', vaultRoot: '/vault' }).ok).toBe(
      false,
    );
    expect(validateSecureStorePath({ candidate: '/secure', vaultRoot: '/vault' }).ok).toBe(true);
  });

  it('ACC-STR-009 ACC-STR-010 clears key material on every lock boundary and keeps current key on failed rotation', () => {
    const session = new ClientSession(),
      key = new Uint8Array(32).fill(7);
    expect(session.unlock(key, 0).ok).toBe(true);
    expect(session.requireKey(15 * 60 * 1000).ok).toBe(false);
    expect(key).toEqual(new Uint8Array(32).fill(7));
    expect(session.unlock(key, 1).ok).toBe(true);
    session.onSleep();
    expect(session.unlocked).toBe(false);
    const current = { key: 'old' };
    expect(
      rotateClientKey({
        current,
        stage: () => ({ ok: false, error: { code: 'x' } }) as never,
        validate: () => true,
      }).ok,
    ).toBe(false);
    expect(current).toEqual({ key: 'old' });
  });

  it('ACC-STR-012 ACC-FIL-011 serializes mutations and invalidates source decisions before Shadow publication', () => {
    const lock = { jobId: 'PB-20260828-0123456789', operationId: 'one', heartbeatAt: 'now' };
    expect(acquireJobMutationLock(lock, { ...lock, operationId: 'two' }, false).ok).toBe(false);
    expect(acquireJobMutationLock(lock, { ...lock, operationId: 'two' }, true).ok).toBe(true);
    expect(invalidateSourceSnapshot('READY_TO_BUILD')).toEqual({
      ok: true,
      value: { state: 'SCANNING', publishShadow: false, stale: true },
    });
    expect(transitionJob('REVIEW_REQUIRED', 'READY_TO_BUILD').ok).toBe(true);
    expect(transitionJob('EXPORTED', 'READY_TO_BUILD').ok).toBe(false);
  });
});

describe('Review state safety', () => {
  const accepted = {
    entityId: 'a',
    type: 'PERSON' as const,
    status: 'ACCEPTED' as const,
    handling: 'TOKENIZE' as const,
    occurrenceIds: ['1', '2'],
  };
  it('ACC-REV-001 ACC-REV-002 applies entity decisions and forces both split sides back to PENDING', () => {
    const split = splitReviewEntity(accepted, ['2'], 'b');
    expect(split.ok && split.value.map((entity) => entity.status)).toEqual(['PENDING', 'PENDING']);
    expect(reviewReady([accepted])).toBe(true);
  });
  it('ACC-REV-003 ACC-REV-005 ACC-REV-010 retains stricter handling and requires explicit batch preview/review', () => {
    const merged = mergeReviewEntities(
      accepted,
      {
        ...accepted,
        entityId: 'b',
        handling: 'BLOCK_EXPORT',
        status: 'BLOCKED',
        occurrenceIds: ['3'],
      },
      'c',
      'PERSON',
    );
    expect(merged.ok && merged.value).toMatchObject({
      handling: 'BLOCK_EXPORT',
      status: 'BLOCKED',
      occurrenceIds: ['1', '2', '3'],
    });
    expect(reviewReady(merged.ok ? [merged.value] : [])).toBe(false);
    expect(previewBatchAction(['a', 'a', 'b'], ['one', 'two', 'three', 'four'])).toEqual({
      count: 2,
      examples: ['one', 'two', 'three'],
    });
  });
});
