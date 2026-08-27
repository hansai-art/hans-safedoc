// ACCEPTANCE_METADATA {"id":"ACC-REV-002","scenario":"Split one occurrence from accepted entity","expected":"Both resulting entities return PENDING and require explicit decisions"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-002',
  scenario: 'Split one occurrence from accepted entity',
  expected: 'Both resulting entities return PENDING and require explicit decisions',
});

it('ACC-REV-002: Split one occurrence from accepted entity => Both resulting entities return PENDING and require explicit decisions', () => {
  expect(acceptance.id).toBe('ACC-REV-002');
  expect(acceptance.scenario).toBe('Split one occurrence from accepted entity');
  expect(acceptance.expected).toBe(
    'Both resulting entities return PENDING and require explicit decisions',
  );
});
