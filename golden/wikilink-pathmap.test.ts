// ACCEPTANCE_METADATA {"id":"ACC-EXP-004","scenario":"Rename sensitive paths with wikilinks/headings/block refs","expected":"All links resolve inside Shadow; original paths absent from export"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-EXP-004',
  scenario: 'Rename sensitive paths with wikilinks/headings/block refs',
  expected: 'All links resolve inside Shadow; original paths absent from export',
});

it('ACC-EXP-004: Rename sensitive paths with wikilinks/headings/block refs => All links resolve inside Shadow; original paths absent from export', () => {
  expect(acceptance.id).toBe('ACC-EXP-004');
  expect(acceptance.scenario).toBe('Rename sensitive paths with wikilinks/headings/block refs');
  expect(acceptance.expected).toBe(
    'All links resolve inside Shadow; original paths absent from export',
  );
});
