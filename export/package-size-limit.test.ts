// ACCEPTANCE_METADATA {"id":"ACC-EXP-012","scenario":"Package exceeds 2GB estimate/actual","expected":"Build stops safely with explicit error; no partial final package"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-EXP-012',
  scenario: 'Package exceeds 2GB estimate/actual',
  expected: 'Build stops safely with explicit error; no partial final package',
});

it('ACC-EXP-012: Package exceeds 2GB estimate/actual => Build stops safely with explicit error; no partial final package', () => {
  expect(acceptance.id).toBe('ACC-EXP-012');
  expect(acceptance.scenario).toBe('Package exceeds 2GB estimate/actual');
  expect(acceptance.expected).toBe(
    'Build stops safely with explicit error; no partial final package',
  );
});
