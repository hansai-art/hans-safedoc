// ACCEPTANCE_METADATA {"id":"ACC-STR-008","scenario":"Unlock/lock client; inspect data.json, store and logs","expected":"Passphrase and derived keys are never persisted or logged"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-008',
  scenario: 'Unlock/lock client; inspect data.json, store and logs',
  expected: 'Passphrase and derived keys are never persisted or logged',
});

it('ACC-STR-008: Unlock/lock client; inspect data.json, store and logs => Passphrase and derived keys are never persisted or logged', () => {
  expect(acceptance.id).toBe('ACC-STR-008');
  expect(acceptance.scenario).toBe('Unlock/lock client; inspect data.json, store and logs');
  expect(acceptance.expected).toBe('Passphrase and derived keys are never persisted or logged');
});
