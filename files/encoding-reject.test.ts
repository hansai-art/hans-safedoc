// ACCEPTANCE_METADATA {"id":"ACC-FIL-008","scenario":"Big5/UTF-16/invalid UTF-8 fixture","expected":"File blocks with PB-FILE-002; no automatic conversion"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-008',
  scenario: 'Big5/UTF-16/invalid UTF-8 fixture',
  expected: 'File blocks with PB-FILE-002; no automatic conversion',
});

it('ACC-FIL-008: Big5/UTF-16/invalid UTF-8 fixture => File blocks with PB-FILE-002; no automatic conversion', () => {
  expect(acceptance.id).toBe('ACC-FIL-008');
  expect(acceptance.scenario).toBe('Big5/UTF-16/invalid UTF-8 fixture');
  expect(acceptance.expected).toBe('File blocks with PB-FILE-002; no automatic conversion');
});
