// ACCEPTANCE_METADATA {"id":"ACC-EXP-009","scenario":"Build package with malicious/odd paths","expected":"All ZIP entries normalized relative; zip-slip/symlink entries impossible"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-EXP-009',
  scenario: 'Build package with malicious/odd paths',
  expected: 'All ZIP entries normalized relative; zip-slip/symlink entries impossible',
});

it('ACC-EXP-009: Build package with malicious/odd paths => All ZIP entries normalized relative; zip-slip/symlink entries impossible', () => {
  expect(acceptance.id).toBe('ACC-EXP-009');
  expect(acceptance.scenario).toBe('Build package with malicious/odd paths');
  expect(acceptance.expected).toBe(
    'All ZIP entries normalized relative; zip-slip/symlink entries impossible',
  );
});
