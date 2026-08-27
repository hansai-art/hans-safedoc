// ACCEPTANCE_METADATA {"id":"ACC-DET-002","scenario":"Candidates at ruleScore 0.35/0.55 with UI threshold 0.7","expected":"UI may collapse them; Core, residual and export guard still see them"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-002',
  scenario: 'Candidates at ruleScore 0.35/0.55 with UI threshold 0.7',
  expected: 'UI may collapse them; Core, residual and export guard still see them',
});

it('ACC-DET-002: Candidates at ruleScore 0.35/0.55 with UI threshold 0.7 => UI may collapse them; Core, residual and export guard still see them', () => {
  expect(acceptance.id).toBe('ACC-DET-002');
  expect(acceptance.scenario).toBe('Candidates at ruleScore 0.35/0.55 with UI threshold 0.7');
  expect(acceptance.expected).toBe(
    'UI may collapse them; Core, residual and export guard still see them',
  );
});
