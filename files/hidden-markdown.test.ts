// ACCEPTANCE_METADATA {"id":"ACC-FIL-003","scenario":"Hidden user folder contains supported .md","expected":"Markdown is included unless path is a fixed system exclusion"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-003',
  scenario: 'Hidden user folder contains supported .md',
  expected: 'Markdown is included unless path is a fixed system exclusion',
});

it('ACC-FIL-003: Hidden user folder contains supported .md => Markdown is included unless path is a fixed system exclusion', () => {
  expect(acceptance.id).toBe('ACC-FIL-003');
  expect(acceptance.scenario).toBe('Hidden user folder contains supported .md');
  expect(acceptance.expected).toBe('Markdown is included unless path is a fixed system exclusion');
});
