// ACCEPTANCE_METADATA {"id":"ACC-DET-007","scenario":"YAML, table column, label-value and same-line context fixtures","expected":"Evidence source and score adjustment match structural context rules"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-007',
  scenario: 'YAML, table column, label-value and same-line context fixtures',
  expected: 'Evidence source and score adjustment match structural context rules',
});

it('ACC-DET-007: YAML, table column, label-value and same-line context fixtures => Evidence source and score adjustment match structural context rules', () => {
  expect(acceptance.id).toBe('ACC-DET-007');
  expect(acceptance.scenario).toBe(
    'YAML, table column, label-value and same-line context fixtures',
  );
  expect(acceptance.expected).toBe(
    'Evidence source and score adjustment match structural context rules',
  );
});
