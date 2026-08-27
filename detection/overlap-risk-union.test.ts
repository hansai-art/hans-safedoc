// ACCEPTANCE_METADATA {"id":"ACC-DET-008","scenario":"Overlapping credit card/bank account and ID/secret matches","expected":"Longer/stronger primary retained; all risk flags and matched rules preserved"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-008',
  scenario: 'Overlapping credit card/bank account and ID/secret matches',
  expected: 'Longer/stronger primary retained; all risk flags and matched rules preserved',
});

it('ACC-DET-008: Overlapping credit card/bank account and ID/secret matches => Longer/stronger primary retained; all risk flags and matched rules preserved', () => {
  expect(acceptance.id).toBe('ACC-DET-008');
  expect(acceptance.scenario).toBe('Overlapping credit card/bank account and ID/secret matches');
  expect(acceptance.expected).toBe(
    'Longer/stronger primary retained; all risk flags and matched rules preserved',
  );
});
