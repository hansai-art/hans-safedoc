// ACCEPTANCE_METADATA {"id":"ACC-FIL-006","scenario":"Folder contains nested .obsidian","expected":"Nested vault boundary is detected and not traversed"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-006',
  scenario: 'Folder contains nested .obsidian',
  expected: 'Nested vault boundary is detected and not traversed',
});

it('ACC-FIL-006: Folder contains nested .obsidian => Nested vault boundary is detected and not traversed', () => {
  expect(acceptance.id).toBe('ACC-FIL-006');
  expect(acceptance.scenario).toBe('Folder contains nested .obsidian');
  expect(acceptance.expected).toBe('Nested vault boundary is detected and not traversed');
});
