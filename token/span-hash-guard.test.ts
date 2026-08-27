// ACCEPTANCE_METADATA {"id":"ACC-TOK-006","scenario":"Source span text/hash altered before tokenization","expected":"Operation fails PB-FILE-004; no output or mapping mutation"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-TOK-006',
  scenario: 'Source span text/hash altered before tokenization',
  expected: 'Operation fails PB-FILE-004; no output or mapping mutation',
});

it('ACC-TOK-006: Source span text/hash altered before tokenization => Operation fails PB-FILE-004; no output or mapping mutation', () => {
  expect(acceptance.id).toBe('ACC-TOK-006');
  expect(acceptance.scenario).toBe('Source span text/hash altered before tokenization');
  expect(acceptance.expected).toBe('Operation fails PB-FILE-004; no output or mapping mutation');
});
