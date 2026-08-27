import { expect, it } from 'vitest';
import { decryptMappingRecord, encryptMappingRecord } from '@privacy-bridge/core';
it('ACC-TOK-013 encrypts and reloads mapping records with authenticated bytes', () => {
  const key = new Uint8Array(32).fill(7),
    record = encryptMappingRecord(key, {
      token: '⟦PB:PERSON:0000000000000000:00000000000000000000⟧',
      decision: 'ACCEPTED',
    });
  const result = decryptMappingRecord(key, record);
  expect(result.ok && result.value).toMatchObject({ decision: 'ACCEPTED' });
});
