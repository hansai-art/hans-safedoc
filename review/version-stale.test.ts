import { expect, it } from 'vitest';
import { invalidateReviewForVersionChange, transitionJob } from '@privacy-bridge/core';
it('ACC-REV-012 marks reviewed decisions stale and requires a rescan transition', () => {
  const stale = invalidateReviewForVersionChange([
    {
      entityId: 'a',
      type: 'PERSON' as const,
      status: 'ACCEPTED' as const,
      handling: 'TOKENIZE' as const,
      occurrenceIds: ['1'],
    },
  ]);
  expect(stale[0]?.status).toBe('PENDING');
  expect(transitionJob('READY_TO_BUILD', 'SCANNING').ok).toBe(true);
});
