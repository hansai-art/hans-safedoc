// ACCEPTANCE_METADATA {"id":"ACC-FIL-004","scenario":"Scope contains PDF/image/office/binary files","expected":"All appear as UNSUPPORTED_PENDING_EXCLUSION; scan cannot start until confirmed"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-004',
  scenario: 'Scope contains PDF/image/office/binary files',
  expected: 'All appear as UNSUPPORTED_PENDING_EXCLUSION; scan cannot start until confirmed',
});

it('ACC-FIL-004: Scope contains PDF/image/office/binary files => All appear as UNSUPPORTED_PENDING_EXCLUSION; scan cannot start until confirmed', () => {
  expect(acceptance.id).toBe('ACC-FIL-004');
  expect(acceptance.scenario).toBe('Scope contains PDF/image/office/binary files');
  expect(acceptance.expected).toBe(
    'All appear as UNSUPPORTED_PENDING_EXCLUSION; scan cannot start until confirmed',
  );
});
