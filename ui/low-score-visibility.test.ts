import { expect, it } from 'vitest';
import { visibleReviewEntities } from '@privacy-bridge/core';
it('ACC-REV-004 retains low-score count and exposes candidates with show-all', () => {
  const entities = [
    {
      entityId: 'low',
      type: 'PERSON' as const,
      status: 'PENDING' as const,
      handling: 'TOKENIZE' as const,
      occurrenceIds: ['1'],
      ruleScore: 0.35,
    },
    {
      entityId: 'high',
      type: 'PERSON' as const,
      status: 'PENDING' as const,
      handling: 'TOKENIZE' as const,
      occurrenceIds: ['2'],
      ruleScore: 0.8,
    },
  ];
  expect(visibleReviewEntities(entities, 0.7, false)).toMatchObject({
    count: 2,
    visible: [entities[1]],
  });
  expect(visibleReviewEntities(entities, 0.7, true).visible).toHaveLength(2);
});
