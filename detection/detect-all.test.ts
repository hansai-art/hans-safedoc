import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-001 detects validator-approved mixed Taiwan fixture without mutation', () => {
  const source = '身分證：A123456789\n信箱：a@example.com\n電話：02-2712-3456';
  const result = detectAll(source);
  expect(result.ok && result.value.map((c) => c.primaryType)).toEqual([
    'TW_ID',
    'EMAIL',
    'TW_LANDLINE',
  ]);
  expect(source).toBe('身分證：A123456789\n信箱：a@example.com\n電話：02-2712-3456');
});
