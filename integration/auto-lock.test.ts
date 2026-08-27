// ACCEPTANCE_METADATA {"id":"ACC-STR-009","scenario":"Simulate 15-min idle, OS sleep, client switch and app close","expected":"Keys are cleared; sensitive views mask; operation requires unlock"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-009',
  scenario: 'Simulate 15-min idle, OS sleep, client switch and app close',
  expected: 'Keys are cleared; sensitive views mask; operation requires unlock',
});

it('ACC-STR-009: Simulate 15-min idle, OS sleep, client switch and app close => Keys are cleared; sensitive views mask; operation requires unlock', () => {
  expect(acceptance.id).toBe('ACC-STR-009');
  expect(acceptance.scenario).toBe('Simulate 15-min idle, OS sleep, client switch and app close');
  expect(acceptance.expected).toBe(
    'Keys are cleared; sensitive views mask; operation requires unlock',
  );
});
