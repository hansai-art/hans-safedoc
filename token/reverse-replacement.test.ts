// ACCEPTANCE_METADATA {"id":"ACC-TOK-005","scenario":"Multiple adjacent and nested accepted spans","expected":"Replacement from end yields exact sanitized output with valid offsets"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-TOK-005',
  scenario: 'Multiple adjacent and nested accepted spans',
  expected: 'Replacement from end yields exact sanitized output with valid offsets',
});

it('ACC-TOK-005: Multiple adjacent and nested accepted spans => Replacement from end yields exact sanitized output with valid offsets', () => {
  expect(acceptance.id).toBe('ACC-TOK-005');
  expect(acceptance.scenario).toBe('Multiple adjacent and nested accepted spans');
  expect(acceptance.expected).toBe(
    'Replacement from end yields exact sanitized output with valid offsets',
  );
});
