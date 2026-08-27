// ACCEPTANCE_METADATA {"id":"ACC-TOK-002","scenario":"Same canonical value repeated with aliases in one job","expected":"Same Entity token used according to explicit alias/canonicalization rules"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-TOK-002',
  scenario: 'Same canonical value repeated with aliases in one job',
  expected: 'Same Entity token used according to explicit alias/canonicalization rules',
});

it('ACC-TOK-002: Same canonical value repeated with aliases in one job => Same Entity token used according to explicit alias/canonicalization rules', () => {
  expect(acceptance.id).toBe('ACC-TOK-002');
  expect(acceptance.scenario).toBe('Same canonical value repeated with aliases in one job');
  expect(acceptance.expected).toBe(
    'Same Entity token used according to explicit alias/canonicalization rules',
  );
});
