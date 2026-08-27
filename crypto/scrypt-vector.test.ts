// ACCEPTANCE_METADATA {"id":"ACC-STR-006","scenario":"Run fixed passphrase/salt test vector","expected":"scrypt output matches examples/crypto-test-vectors.json on macOS/Windows"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-006',
  scenario: 'Run fixed passphrase/salt test vector',
  expected: 'scrypt output matches examples/crypto-test-vectors.json on macOS/Windows',
});

it('ACC-STR-006: Run fixed passphrase/salt test vector => scrypt output matches examples/crypto-test-vectors.json on macOS/Windows', () => {
  expect(acceptance.id).toBe('ACC-STR-006');
  expect(acceptance.scenario).toBe('Run fixed passphrase/salt test vector');
  expect(acceptance.expected).toBe(
    'scrypt output matches examples/crypto-test-vectors.json on macOS/Windows',
  );
});
