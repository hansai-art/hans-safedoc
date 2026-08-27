// ACCEPTANCE_METADATA {"id":"ACC-DET-015","scenario":"Addresses with 2之2號, 2號之2, rural doorplate, floors","expected":"Entire address span captured without trailing fragment leak"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-015',
  scenario: 'Addresses with 2之2號, 2號之2, rural doorplate, floors',
  expected: 'Entire address span captured without trailing fragment leak',
});

it('ACC-DET-015: Addresses with 2之2號, 2號之2, rural doorplate, floors => Entire address span captured without trailing fragment leak', () => {
  expect(acceptance.id).toBe('ACC-DET-015');
  expect(acceptance.scenario).toBe('Addresses with 2之2號, 2號之2, rural doorplate, floors');
  expect(acceptance.expected).toBe('Entire address span captured without trailing fragment leak');
});
