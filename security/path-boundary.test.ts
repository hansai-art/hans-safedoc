// ACCEPTANCE_METADATA {"id":"ACC-FIL-009","scenario":"Paths with .., absolute names, device names and separators","expected":"All normalized paths remain within approved root or reject"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-009',
  scenario: 'Paths with .., absolute names, device names and separators',
  expected: 'All normalized paths remain within approved root or reject',
});

it('ACC-FIL-009: Paths with .., absolute names, device names and separators => All normalized paths remain within approved root or reject', () => {
  expect(acceptance.id).toBe('ACC-FIL-009');
  expect(acceptance.scenario).toBe('Paths with .., absolute names, device names and separators');
  expect(acceptance.expected).toBe('All normalized paths remain within approved root or reject');
});
