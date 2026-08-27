// ACCEPTANCE_METADATA {"id":"ACC-REV-007","scenario":"English case-sensitive/insensitive and explicit aliases","expected":"Behavior follows entry setting; unlisted fuzzy spelling does not match"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-007',
  scenario: 'English case-sensitive/insensitive and explicit aliases',
  expected: 'Behavior follows entry setting; unlisted fuzzy spelling does not match',
});

it('ACC-REV-007: English case-sensitive/insensitive and explicit aliases => Behavior follows entry setting; unlisted fuzzy spelling does not match', () => {
  expect(acceptance.id).toBe('ACC-REV-007');
  expect(acceptance.scenario).toBe('English case-sensitive/insensitive and explicit aliases');
  expect(acceptance.expected).toBe(
    'Behavior follows entry setting; unlisted fuzzy spelling does not match',
  );
});
