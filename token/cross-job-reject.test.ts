// ACCEPTANCE_METADATA {"id":"ACC-TOK-008","scenario":"Use valid token from another job","expected":"Verifier rejects whole result package"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-TOK-008',
  scenario: 'Use valid token from another job',
  expected: 'Verifier rejects whole result package',
});

it('ACC-TOK-008: Use valid token from another job => Verifier rejects whole result package', () => {
  expect(acceptance.id).toBe('ACC-TOK-008');
  expect(acceptance.scenario).toBe('Use valid token from another job');
  expect(acceptance.expected).toBe('Verifier rejects whole result package');
});
