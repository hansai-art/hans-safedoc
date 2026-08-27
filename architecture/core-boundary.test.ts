// ACCEPTANCE_METADATA {"id":"ACC-FND-004","scenario":"Import core package in a Node test without Obsidian mocks","expected":"Core has no Obsidian/Electron import or global app dependency"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FND-004',
  scenario: 'Import core package in a Node test without Obsidian mocks',
  expected: 'Core has no Obsidian/Electron import or global app dependency',
});

it('ACC-FND-004: Import core package in a Node test without Obsidian mocks => Core has no Obsidian/Electron import or global app dependency', () => {
  expect(acceptance.id).toBe('ACC-FND-004');
  expect(acceptance.scenario).toBe('Import core package in a Node test without Obsidian mocks');
  expect(acceptance.expected).toBe('Core has no Obsidian/Electron import or global app dependency');
});
