import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-008 keeps the precise identifier while unioning overlap risk', () => {
  const result = detectAll('密碼：A123456789');
  expect(result.ok && result.value[0]).toMatchObject({
    primaryType: 'TW_ID',
    handling: 'BLOCK_EXPORT',
  });
  expect(result.ok && result.value[0]?.matchedRules).toEqual(
    expect.arrayContaining(['tw-id-checksum', 'secret-assignment']),
  );
});
