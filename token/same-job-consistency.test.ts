import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { assignEntityTokens } from '@privacy-bridge/core';
it('ACC-TOK-002 reuses one entity token for canonical aliases in one job', () => {
  const result = assignEntityTokens(randomBytes(32), 'job', [
    { type: 'EMAIL', value: 'Hans@Example.com' },
    { type: 'EMAIL', value: 'Hans@example.com' },
  ]);
  expect(result.map((item) => item.token)).toEqual([result[0]?.token, result[0]?.token]);
});
