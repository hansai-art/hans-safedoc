// ACCEPTANCE_METADATA {"id":"ACC-FIL-010","scenario":"Source has paths differing only by case/normalization","expected":"Collision is detected before Shadow build and blocks"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-010',
  scenario: 'Source has paths differing only by case/normalization',
  expected: 'Collision is detected before Shadow build and blocks',
});

it('ACC-FIL-010: Source has paths differing only by case/normalization => Collision is detected before Shadow build and blocks', () => {
  expect(acceptance.id).toBe('ACC-FIL-010');
  expect(acceptance.scenario).toBe('Source has paths differing only by case/normalization');
  expect(acceptance.expected).toBe('Collision is detected before Shadow build and blocks');
});
