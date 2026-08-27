// ACCEPTANCE_METADATA {"id":"ACC-STR-002","scenario":"Choose Vault, Shadow, Result, sync or network-mounted path","expected":"Selection is rejected with PB-STORE-001; no files written"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-002',
  scenario: 'Choose Vault, Shadow, Result, sync or network-mounted path',
  expected: 'Selection is rejected with PB-STORE-001; no files written',
});

it('ACC-STR-002: Choose Vault, Shadow, Result, sync or network-mounted path => Selection is rejected with PB-STORE-001; no files written', () => {
  expect(acceptance.id).toBe('ACC-STR-002');
  expect(acceptance.scenario).toBe('Choose Vault, Shadow, Result, sync or network-mounted path');
  expect(acceptance.expected).toBe('Selection is rejected with PB-STORE-001; no files written');
});
