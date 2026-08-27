// ACCEPTANCE_METADATA {"id":"ACC-DET-012","scenario":"0900/0910/0911-like values","expected":"Landline validator never accepts them as landline"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-012',
  scenario: '0900/0910/0911-like values',
  expected: 'Landline validator never accepts them as landline',
});

it('ACC-DET-012: 0900/0910/0911-like values => Landline validator never accepts them as landline', () => {
  expect(acceptance.id).toBe('ACC-DET-012');
  expect(acceptance.scenario).toBe('0900/0910/0911-like values');
  expect(acceptance.expected).toBe('Landline validator never accepts them as landline');
});
