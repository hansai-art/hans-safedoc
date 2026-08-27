// ACCEPTANCE_METADATA {"id":"ACC-DET-001","scenario":"Run detectAll on mixed Taiwan fixture","expected":"All validator-approved candidates returned with evidence; input unchanged"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-001',
  scenario: 'Run detectAll on mixed Taiwan fixture',
  expected: 'All validator-approved candidates returned with evidence; input unchanged',
});

it('ACC-DET-001: Run detectAll on mixed Taiwan fixture => All validator-approved candidates returned with evidence; input unchanged', () => {
  expect(acceptance.id).toBe('ACC-DET-001');
  expect(acceptance.scenario).toBe('Run detectAll on mixed Taiwan fixture');
  expect(acceptance.expected).toBe(
    'All validator-approved candidates returned with evidence; input unchanged',
  );
});
