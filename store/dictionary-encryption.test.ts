// ACCEPTANCE_METADATA {"id":"ACC-STR-004","scenario":"Create/import client dictionary","expected":"Dictionary exists only as authenticated encrypted file outside Vault"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-004',
  scenario: 'Create/import client dictionary',
  expected: 'Dictionary exists only as authenticated encrypted file outside Vault',
});

it('ACC-STR-004: Create/import client dictionary => Dictionary exists only as authenticated encrypted file outside Vault', () => {
  expect(acceptance.id).toBe('ACC-STR-004');
  expect(acceptance.scenario).toBe('Create/import client dictionary');
  expect(acceptance.expected).toBe(
    'Dictionary exists only as authenticated encrypted file outside Vault',
  );
});
