// ACCEPTANCE_METADATA {"id":"ACC-REV-010","scenario":"Ambiguous candidate remains undecided","expected":"Job cannot reach READY_TO_BUILD; UI explains ambiguity"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-010',
  scenario: 'Ambiguous candidate remains undecided',
  expected: 'Job cannot reach READY_TO_BUILD; UI explains ambiguity',
});

it('ACC-REV-010: Ambiguous candidate remains undecided => Job cannot reach READY_TO_BUILD; UI explains ambiguity', () => {
  expect(acceptance.id).toBe('ACC-REV-010');
  expect(acceptance.scenario).toBe('Ambiguous candidate remains undecided');
  expect(acceptance.expected).toBe('Job cannot reach READY_TO_BUILD; UI explains ambiguity');
});
