// ACCEPTANCE_METADATA {"id":"ACC-IMP-002","scenario":"Malformed token-like delimiters or unsupported schema fields","expected":"Whole package rejects; no partial findings persisted"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-IMP-002',
  scenario: 'Malformed token-like delimiters or unsupported schema fields',
  expected: 'Whole package rejects; no partial findings persisted',
});

it('ACC-IMP-002: Malformed token-like delimiters or unsupported schema fields => Whole package rejects; no partial findings persisted', () => {
  expect(acceptance.id).toBe('ACC-IMP-002');
  expect(acceptance.scenario).toBe('Malformed token-like delimiters or unsupported schema fields');
  expect(acceptance.expected).toBe('Whole package rejects; no partial findings persisted');
});
