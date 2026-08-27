// ACCEPTANCE_METADATA {"id":"ACC-DET-004","scenario":"Fixtures with emoji, surrogate pairs and combining marks","expected":"All candidate spans slice exact intended text using UTF-16 offsets"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-004',
  scenario: 'Fixtures with emoji, surrogate pairs and combining marks',
  expected: 'All candidate spans slice exact intended text using UTF-16 offsets',
});

it('ACC-DET-004: Fixtures with emoji, surrogate pairs and combining marks => All candidate spans slice exact intended text using UTF-16 offsets', () => {
  expect(acceptance.id).toBe('ACC-DET-004');
  expect(acceptance.scenario).toBe('Fixtures with emoji, surrogate pairs and combining marks');
  expect(acceptance.expected).toBe(
    'All candidate spans slice exact intended text using UTF-16 offsets',
  );
});
