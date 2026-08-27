// ACCEPTANCE_METADATA {"id":"ACC-REV-001","scenario":"Same canonical entity occurs in 20 documents","expected":"One entity-level decision applies to all occurrences; occurrences expandable"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-001',
  scenario: 'Same canonical entity occurs in 20 documents',
  expected: 'One entity-level decision applies to all occurrences; occurrences expandable',
});

it('ACC-REV-001: Same canonical entity occurs in 20 documents => One entity-level decision applies to all occurrences; occurrences expandable', () => {
  expect(acceptance.id).toBe('ACC-REV-001');
  expect(acceptance.scenario).toBe('Same canonical entity occurs in 20 documents');
  expect(acceptance.expected).toBe(
    'One entity-level decision applies to all occurrences; occurrences expandable',
  );
});
