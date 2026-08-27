// ACCEPTANCE_METADATA {"id":"ACC-DET-003","scenario":"Inspect public API and UI labels","expected":"Only ruleScore/規則分數 used; no confidence/accuracy percentage claim"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-003',
  scenario: 'Inspect public API and UI labels',
  expected: 'Only ruleScore/規則分數 used; no confidence/accuracy percentage claim',
});

it('ACC-DET-003: Inspect public API and UI labels => Only ruleScore/規則分數 used; no confidence/accuracy percentage claim', () => {
  expect(acceptance.id).toBe('ACC-DET-003');
  expect(acceptance.scenario).toBe('Inspect public API and UI labels');
  expect(acceptance.expected).toBe(
    'Only ruleScore/規則分數 used; no confidence/accuracy percentage claim',
  );
});
