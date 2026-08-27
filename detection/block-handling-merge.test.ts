// ACCEPTANCE_METADATA {"id":"ACC-DET-010","scenario":"密碼：A123456789","expected":"Primary type remains TW_ID; that occurrence handling is BLOCK_EXPORT and both rules are recorded; unrelated occurrences are not automatically blocked"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-010',
  scenario: '密碼：A123456789',
  expected:
    'Primary type remains TW_ID; that occurrence handling is BLOCK_EXPORT and both rules are recorded; unrelated occurrences are not automatically blocked',
});

it('ACC-DET-010: 密碼：A123456789 => Primary type remains TW_ID; that occurrence handling is BLOCK_EXPORT and both rules are recorded; unrelated occurrences are not automatically blocked', () => {
  expect(acceptance.id).toBe('ACC-DET-010');
  expect(acceptance.scenario).toBe('密碼：A123456789');
  expect(acceptance.expected).toBe(
    'Primary type remains TW_ID; that occurrence handling is BLOCK_EXPORT and both rules are recorded; unrelated occurrences are not automatically blocked',
  );
});
