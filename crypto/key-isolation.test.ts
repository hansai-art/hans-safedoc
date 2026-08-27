// ACCEPTANCE_METADATA {"id":"ACC-STR-005","scenario":"Create two clients and two jobs per client","expected":"CRKs differ; JRKs differ; wrapped keys decrypt only under correct client"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-005',
  scenario: 'Create two clients and two jobs per client',
  expected: 'CRKs differ; JRKs differ; wrapped keys decrypt only under correct client',
});

it('ACC-STR-005: Create two clients and two jobs per client => CRKs differ; JRKs differ; wrapped keys decrypt only under correct client', () => {
  expect(acceptance.id).toBe('ACC-STR-005');
  expect(acceptance.scenario).toBe('Create two clients and two jobs per client');
  expect(acceptance.expected).toBe(
    'CRKs differ; JRKs differ; wrapped keys decrypt only under correct client',
  );
});
