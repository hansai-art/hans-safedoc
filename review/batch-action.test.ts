import { expect, it } from 'vitest';
import { confirmBatchDecision, previewBatchAction } from '@privacy-bridge/core';
it('ACC-REV-005 requires confirmation, audits a 100-row batch, and supports undo', () => {
  const entities = Array.from({ length: 100 }, (_, i) => ({
    entityId: `e${i}`,
    type: 'PERSON' as const,
    status: 'PENDING' as const,
    handling: 'TOKENIZE' as const,
    occurrenceIds: [`o${i}`],
  }));
  expect(
    confirmBatchDecision(
      entities,
      entities.map((e) => e.entityId),
      'IGNORED',
      false,
    ).ok,
  ).toBe(false);
  const result = confirmBatchDecision(
    entities,
    entities.map((e) => e.entityId),
    'IGNORED',
    true,
  );
  expect(
    previewBatchAction(
      entities.map((e) => e.entityId),
      ['a', 'b', 'c', 'd'],
    ),
  ).toEqual({ count: 100, examples: ['a', 'b', 'c'] });
  expect(result.ok && result.value.entities.every((e) => e.status === 'IGNORED')).toBe(true);
  expect(result.ok && result.value.audit).toHaveLength(1);
  expect(result.ok && result.value.undo()).toEqual(entities);
});
