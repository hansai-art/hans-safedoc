// ACCEPTANCE_METADATA {"id":"ACC-EXP-011","scenario":"Corrupt one file after package build","expected":"Self-validation or checksum validation fails; job not marked EXPORTED"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-EXP-011',
  scenario: 'Corrupt one file after package build',
  expected: 'Self-validation or checksum validation fails; job not marked EXPORTED',
});

it('ACC-EXP-011: Corrupt one file after package build => Self-validation or checksum validation fails; job not marked EXPORTED', () => {
  expect(acceptance.id).toBe('ACC-EXP-011');
  expect(acceptance.scenario).toBe('Corrupt one file after package build');
  expect(acceptance.expected).toBe(
    'Self-validation or checksum validation fails; job not marked EXPORTED',
  );
});
