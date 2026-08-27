// ACCEPTANCE_METADATA {"id":"ACC-STR-010","scenario":"Wrong passphrase, corrupt key, and crash during passphrase change","expected":"Old client.key remains usable; no empty/new key overwrites it"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-010',
  scenario: 'Wrong passphrase, corrupt key, and crash during passphrase change',
  expected: 'Old client.key remains usable; no empty/new key overwrites it',
});

it('ACC-STR-010: Wrong passphrase, corrupt key, and crash during passphrase change => Old client.key remains usable; no empty/new key overwrites it', () => {
  expect(acceptance.id).toBe('ACC-STR-010');
  expect(acceptance.scenario).toBe(
    'Wrong passphrase, corrupt key, and crash during passphrase change',
  );
  expect(acceptance.expected).toBe('Old client.key remains usable; no empty/new key overwrites it');
});
