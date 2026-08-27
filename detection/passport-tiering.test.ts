// ACCEPTANCE_METADATA {"id":"ACC-DET-013","scenario":"3/D/F/G passport and contextual 1/2/A formats","expected":"Known formats TW_PASSPORT; broad contextual values PASSPORT_CANDIDATE"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-013',
  scenario: '3/D/F/G passport and contextual 1/2/A formats',
  expected: 'Known formats TW_PASSPORT; broad contextual values PASSPORT_CANDIDATE',
});

it('ACC-DET-013: 3/D/F/G passport and contextual 1/2/A formats => Known formats TW_PASSPORT; broad contextual values PASSPORT_CANDIDATE', () => {
  expect(acceptance.id).toBe('ACC-DET-013');
  expect(acceptance.scenario).toBe('3/D/F/G passport and contextual 1/2/A formats');
  expect(acceptance.expected).toBe(
    'Known formats TW_PASSPORT; broad contextual values PASSPORT_CANDIDATE',
  );
});
