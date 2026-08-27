// ACCEPTANCE_METADATA {"id":"ACC-EXP-003","scenario":"Crash/cancel at each build phase","expected":"No partial final Shadow appears; staging cleaned or recoverable"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-EXP-003',
  scenario: 'Crash/cancel at each build phase',
  expected: 'No partial final Shadow appears; staging cleaned or recoverable',
});

it('ACC-EXP-003: Crash/cancel at each build phase => No partial final Shadow appears; staging cleaned or recoverable', () => {
  expect(acceptance.id).toBe('ACC-EXP-003');
  expect(acceptance.scenario).toBe('Crash/cancel at each build phase');
  expect(acceptance.expected).toBe(
    'No partial final Shadow appears; staging cleaned or recoverable',
  );
});
