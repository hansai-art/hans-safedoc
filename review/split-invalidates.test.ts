import { expect, it } from 'vitest';
import { splitReviewEntity } from '@privacy-bridge/core';
it('ACC-REV-002 returns both split entities to pending review', () => {
  const result = splitReviewEntity(
    {
      entityId: 'a',
      type: 'PERSON',
      status: 'ACCEPTED',
      handling: 'TOKENIZE',
      occurrenceIds: ['1', '2'],
    },
    ['2'],
    'b',
  );
  expect(result.ok && result.value.map((e) => e.status)).toEqual(['PENDING', 'PENDING']);
});
