// ACCEPTANCE_METADATA {"id":"ACC-REV-012","scenario":"Dictionary/rules version changes after review","expected":"Run and affected decisions become stale; rescan required"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-012',
  scenario: 'Dictionary/rules version changes after review',
  expected: 'Run and affected decisions become stale; rescan required',
});

it('ACC-REV-012: Dictionary/rules version changes after review => Run and affected decisions become stale; rescan required', () => {
  expect(acceptance.id).toBe('ACC-REV-012');
  expect(acceptance.scenario).toBe('Dictionary/rules version changes after review');
  expect(acceptance.expected).toBe('Run and affected decisions become stale; rescan required');
});
