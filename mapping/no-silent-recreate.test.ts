import { expect, it } from 'vitest';
import { decryptMappingRecord } from '@privacy-bridge/core';
it('ACC-TOK-015 blocks restoration when mapping data or its key is missing', () => {
  const result = decryptMappingRecord(new Uint8Array(32), undefined);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('PB-BACKUP-002');
});
