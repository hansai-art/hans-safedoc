import { expect, it } from 'vitest';
import { applyEntityDecision } from '@privacy-bridge/core';
it('ACC-REV-001 applies one entity decision to occurrences across 20 documents', () => {
  const entity = {
    entityId: 'person',
    type: 'PERSON' as const,
    status: 'PENDING' as const,
    handling: 'TOKENIZE' as const,
    occurrenceIds: Array.from({ length: 20 }, (_, i) => `document-${i}`),
  };
  const accepted = applyEntityDecision(entity, 'ACCEPTED');
  expect(accepted.status).toBe('ACCEPTED');
  expect(accepted.occurrenceIds).toHaveLength(20);
});
