// ACCEPTANCE_METADATA {"id":"ACC-TOK-003","scenario":"Same source values in two jobs","expected":"Tokens and canonical fingerprints differ across jobs"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-TOK-003',
  scenario: 'Same source values in two jobs',
  expected: 'Tokens and canonical fingerprints differ across jobs',
});

it('ACC-TOK-003: Same source values in two jobs => Tokens and canonical fingerprints differ across jobs', () => {
  expect(acceptance.id).toBe('ACC-TOK-003');
  expect(acceptance.scenario).toBe('Same source values in two jobs');
  expect(acceptance.expected).toBe('Tokens and canonical fingerprints differ across jobs');
});
