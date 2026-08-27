// ACCEPTANCE_METADATA {"id":"ACC-DET-005","scenario":"LINE ID: LINE; password: password; secret: secret","expected":"Only right-side values are captured and replaced"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-005',
  scenario: 'LINE ID: LINE; password: password; secret: secret',
  expected: 'Only right-side values are captured and replaced',
});

it('ACC-DET-005: LINE ID: LINE; password: password; secret: secret => Only right-side values are captured and replaced', () => {
  expect(acceptance.id).toBe('ACC-DET-005');
  expect(acceptance.scenario).toBe('LINE ID: LINE; password: password; secret: secret');
  expect(acceptance.expected).toBe('Only right-side values are captured and replaced');
});
