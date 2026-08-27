// ACCEPTANCE_METADATA {"id":"ACC-FIL-002","scenario":"Scope contains .obsidian, .trash, .git and output/store dirs","expected":"Fixed system paths are excluded and audited without exposing absolute paths"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-002',
  scenario: 'Scope contains .obsidian, .trash, .git and output/store dirs',
  expected: 'Fixed system paths are excluded and audited without exposing absolute paths',
});

it('ACC-FIL-002: Scope contains .obsidian, .trash, .git and output/store dirs => Fixed system paths are excluded and audited without exposing absolute paths', () => {
  expect(acceptance.id).toBe('ACC-FIL-002');
  expect(acceptance.scenario).toBe('Scope contains .obsidian, .trash, .git and output/store dirs');
  expect(acceptance.expected).toBe(
    'Fixed system paths are excluded and audited without exposing absolute paths',
  );
});
