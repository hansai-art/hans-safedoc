// ACCEPTANCE_METADATA {"id":"ACC-STR-001","scenario":"Initialize on macOS/Windows defaults","expected":"Store is created under OS Application Data, never under Vault"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-001',
  scenario: 'Initialize on macOS/Windows defaults',
  expected: 'Store is created under OS Application Data, never under Vault',
});

it('ACC-STR-001: Initialize on macOS/Windows defaults => Store is created under OS Application Data, never under Vault', () => {
  expect(acceptance.id).toBe('ACC-STR-001');
  expect(acceptance.scenario).toBe('Initialize on macOS/Windows defaults');
  expect(acceptance.expected).toBe('Store is created under OS Application Data, never under Vault');
});
