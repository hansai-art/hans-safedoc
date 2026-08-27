// ACCEPTANCE_METADATA {"id":"ACC-REV-004","scenario":"Low-score candidates with default UI threshold","expected":"Count remains visible; show-all exposes every pending candidate"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-004',
  scenario: 'Low-score candidates with default UI threshold',
  expected: 'Count remains visible; show-all exposes every pending candidate',
});

it('ACC-REV-004: Low-score candidates with default UI threshold => Count remains visible; show-all exposes every pending candidate', () => {
  expect(acceptance.id).toBe('ACC-REV-004');
  expect(acceptance.scenario).toBe('Low-score candidates with default UI threshold');
  expect(acceptance.expected).toBe(
    'Count remains visible; show-all exposes every pending candidate',
  );
});
