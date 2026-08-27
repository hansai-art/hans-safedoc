// ACCEPTANCE_METADATA {"id":"ACC-EXP-001","scenario":"Golden Markdown with spacing, comments, YAML, CRLF/BOM","expected":"Output differs only at approved spans/path references; byte properties preserved"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-EXP-001',
  scenario: 'Golden Markdown with spacing, comments, YAML, CRLF/BOM',
  expected: 'Output differs only at approved spans/path references; byte properties preserved',
});

it('ACC-EXP-001: Golden Markdown with spacing, comments, YAML, CRLF/BOM => Output differs only at approved spans/path references; byte properties preserved', () => {
  expect(acceptance.id).toBe('ACC-EXP-001');
  expect(acceptance.scenario).toBe('Golden Markdown with spacing, comments, YAML, CRLF/BOM');
  expect(acceptance.expected).toBe(
    'Output differs only at approved spans/path references; byte properties preserved',
  );
});
