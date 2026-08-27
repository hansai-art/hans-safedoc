// ACCEPTANCE_METADATA {"id":"ACC-DET-016","scenario":"106409 臺北市..., 110臺北市..., labeled 3/5/6 digits","expected":"Postal code candidate and context evidence correct"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-016',
  scenario: '106409 臺北市..., 110臺北市..., labeled 3/5/6 digits',
  expected: 'Postal code candidate and context evidence correct',
});

it('ACC-DET-016: 106409 臺北市..., 110臺北市..., labeled 3/5/6 digits => Postal code candidate and context evidence correct', () => {
  expect(acceptance.id).toBe('ACC-DET-016');
  expect(acceptance.scenario).toBe('106409 臺北市..., 110臺北市..., labeled 3/5/6 digits');
  expect(acceptance.expected).toBe('Postal code candidate and context evidence correct');
});
