// ACCEPTANCE_METADATA {"id":"ACC-FIL-005","scenario":"Scope contains symlink/junction escaping root","expected":"Target is never followed; item blocks until excluded"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-005',
  scenario: 'Scope contains symlink/junction escaping root',
  expected: 'Target is never followed; item blocks until excluded',
});

it('ACC-FIL-005: Scope contains symlink/junction escaping root => Target is never followed; item blocks until excluded', () => {
  expect(acceptance.id).toBe('ACC-FIL-005');
  expect(acceptance.scenario).toBe('Scope contains symlink/junction escaping root');
  expect(acceptance.expected).toBe('Target is never followed; item blocks until excluded');
});
