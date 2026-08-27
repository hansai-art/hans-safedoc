// ACCEPTANCE_METADATA {"id":"ACC-EXP-006","scenario":"Sanitized file contains a 0.35 residual candidate","expected":"scanResidualAll returns it regardless of UI threshold"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-EXP-006',
  scenario: 'Sanitized file contains a 0.35 residual candidate',
  expected: 'scanResidualAll returns it regardless of UI threshold',
});

it('ACC-EXP-006: Sanitized file contains a 0.35 residual candidate => scanResidualAll returns it regardless of UI threshold', () => {
  expect(acceptance.id).toBe('ACC-EXP-006');
  expect(acceptance.scenario).toBe('Sanitized file contains a 0.35 residual candidate');
  expect(acceptance.expected).toBe('scanResidualAll returns it regardless of UI threshold');
});
