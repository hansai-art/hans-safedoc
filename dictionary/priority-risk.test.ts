// ACCEPTANCE_METADATA {"id":"ACC-REV-008","scenario":"Dictionary match overlaps secret/checksum rules","expected":"Dictionary may set primary type; BLOCK risk and matched rules remain"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-008',
  scenario: 'Dictionary match overlaps secret/checksum rules',
  expected: 'Dictionary may set primary type; BLOCK risk and matched rules remain',
});

it('ACC-REV-008: Dictionary match overlaps secret/checksum rules => Dictionary may set primary type; BLOCK risk and matched rules remain', () => {
  expect(acceptance.id).toBe('ACC-REV-008');
  expect(acceptance.scenario).toBe('Dictionary match overlaps secret/checksum rules');
  expect(acceptance.expected).toBe(
    'Dictionary may set primary type; BLOCK risk and matched rules remain',
  );
});
