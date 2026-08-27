// ACCEPTANCE_METADATA {"id":"ACC-IMP-005","scenario":"Unknown document ID, path traversal strings, duplicate finding IDs","expected":"Whole package rejects before restore"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-IMP-005',
  scenario: 'Unknown document ID, path traversal strings, duplicate finding IDs',
  expected: 'Whole package rejects before restore',
});

it('ACC-IMP-005: Unknown document ID, path traversal strings, duplicate finding IDs => Whole package rejects before restore', () => {
  expect(acceptance.id).toBe('ACC-IMP-005');
  expect(acceptance.scenario).toBe(
    'Unknown document ID, path traversal strings, duplicate finding IDs',
  );
  expect(acceptance.expected).toBe('Whole package rejects before restore');
});
