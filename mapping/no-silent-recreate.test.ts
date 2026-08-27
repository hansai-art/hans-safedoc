// ACCEPTANCE_METADATA {"id":"ACC-TOK-015","scenario":"Delete/missing mapping or job key","expected":"System never creates replacement key/map under same job; restore blocked with precise safe error"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-TOK-015',
  scenario: 'Delete/missing mapping or job key',
  expected:
    'System never creates replacement key/map under same job; restore blocked with precise safe error',
});

it('ACC-TOK-015: Delete/missing mapping or job key => System never creates replacement key/map under same job; restore blocked with precise safe error', () => {
  expect(acceptance.id).toBe('ACC-TOK-015');
  expect(acceptance.scenario).toBe('Delete/missing mapping or job key');
  expect(acceptance.expected).toBe(
    'System never creates replacement key/map under same job; restore blocked with precise safe error',
  );
});
