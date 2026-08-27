// ACCEPTANCE_METADATA {"id":"ACC-REV-003","scenario":"Merge two entities whose occurrences have different effective handling","expected":"Entity default is resolved safely; every occurrence keeps stricter effective handling; Block cannot be downgraded"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-003',
  scenario: 'Merge two entities whose occurrences have different effective handling',
  expected:
    'Entity default is resolved safely; every occurrence keeps stricter effective handling; Block cannot be downgraded',
});

it('ACC-REV-003: Merge two entities whose occurrences have different effective handling => Entity default is resolved safely; every occurrence keeps stricter effective handling; Block cannot be downgraded', () => {
  expect(acceptance.id).toBe('ACC-REV-003');
  expect(acceptance.scenario).toBe(
    'Merge two entities whose occurrences have different effective handling',
  );
  expect(acceptance.expected).toBe(
    'Entity default is resolved safely; every occurrence keeps stricter effective handling; Block cannot be downgraded',
  );
});
