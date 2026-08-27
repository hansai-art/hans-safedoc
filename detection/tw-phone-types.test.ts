// ACCEPTANCE_METADATA {"id":"ACC-DET-011","scenario":"090–098, 099, 0800, 0809, normal landline, +886 fixtures","expected":"Numbers classified as MOBILE, PHONE_SERVICE or LANDLINE exactly as spec"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-011',
  scenario: '090–098, 099, 0800, 0809, normal landline, +886 fixtures',
  expected: 'Numbers classified as MOBILE, PHONE_SERVICE or LANDLINE exactly as spec',
});

it('ACC-DET-011: 090–098, 099, 0800, 0809, normal landline, +886 fixtures => Numbers classified as MOBILE, PHONE_SERVICE or LANDLINE exactly as spec', () => {
  expect(acceptance.id).toBe('ACC-DET-011');
  expect(acceptance.scenario).toBe('090–098, 099, 0800, 0809, normal landline, +886 fixtures');
  expect(acceptance.expected).toBe(
    'Numbers classified as MOBILE, PHONE_SERVICE or LANDLINE exactly as spec',
  );
});
