import { expect, it } from 'vitest';
import { mergeReviewEntities } from '@privacy-bridge/core';
it('ACC-REV-003 preserves stricter block handling on a merge', () => {
  const result = mergeReviewEntities(
    {
      entityId: 'a',
      type: 'PERSON',
      status: 'ACCEPTED',
      handling: 'TOKENIZE',
      occurrenceIds: ['1'],
    },
    {
      entityId: 'b',
      type: 'PERSON',
      status: 'ACCEPTED',
      handling: 'BLOCK_EXPORT',
      occurrenceIds: ['2'],
    },
    'c',
    'PERSON',
  );
  expect(result.ok && result.value).toMatchObject({
    handling: 'BLOCK_EXPORT',
    status: 'BLOCKED',
    occurrenceIds: ['1', '2'],
  });
});
