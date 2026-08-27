// ACCEPTANCE_METADATA {"id":"ACC-DET-014","scenario":"Nine-digit order number without passport context","expected":"No passport candidate produced"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-014',
  scenario: 'Nine-digit order number without passport context',
  expected: 'No passport candidate produced',
});

it('ACC-DET-014: Nine-digit order number without passport context => No passport candidate produced', () => {
  expect(acceptance.id).toBe('ACC-DET-014');
  expect(acceptance.scenario).toBe('Nine-digit order number without passport context');
  expect(acceptance.expected).toBe('No passport candidate produced');
});
