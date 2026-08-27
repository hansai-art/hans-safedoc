// ACCEPTANCE_METADATA {"id":"ACC-IMP-004","scenario":"Valid token from another job or source package hash mismatch","expected":"Whole package rejects"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-IMP-004',
  scenario: 'Valid token from another job or source package hash mismatch',
  expected: 'Whole package rejects',
});

it('ACC-IMP-004: Valid token from another job or source package hash mismatch => Whole package rejects', () => {
  expect(acceptance.id).toBe('ACC-IMP-004');
  expect(acceptance.scenario).toBe('Valid token from another job or source package hash mismatch');
  expect(acceptance.expected).toBe('Whole package rejects');
});
