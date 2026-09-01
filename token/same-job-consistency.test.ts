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

it('ACC-TOK-002 normalizes Taiwan local and international phone formatting within one job', () => {
  const result = assignEntityTokens(randomBytes(32), 'job', [
    { type: 'TW_MOBILE', value: '0912-345-678' },
    { type: 'TW_MOBILE', value: '+886 912 345 678' },
    { type: 'TW_LANDLINE', value: '02-2712-3456' },
    { type: 'TW_LANDLINE', value: '+886 2 2712 3456' },
  ]);
  expect(result[0]?.token).toBe(result[1]?.token);
  expect(result[2]?.token).toBe(result[3]?.token);
  expect(result[0]?.token).not.toBe(result[2]?.token);
});
