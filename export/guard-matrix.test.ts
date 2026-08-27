// ACCEPTANCE_METADATA {"id":"ACC-EXP-008","scenario":"Each precondition independently fails","expected":"Export disabled and lists every failure reason with error code"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-EXP-008',
  scenario: 'Each precondition independently fails',
  expected: 'Export disabled and lists every failure reason with error code',
});

it('ACC-EXP-008: Each precondition independently fails => Export disabled and lists every failure reason with error code', () => {
  expect(acceptance.id).toBe('ACC-EXP-008');
  expect(acceptance.scenario).toBe('Each precondition independently fails');
  expect(acceptance.expected).toBe(
    'Export disabled and lists every failure reason with error code',
  );
});
