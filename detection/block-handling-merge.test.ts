import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-010 blocks only the secret-labelled identifier occurrence', () => {
  const result = detectAll('密碼：A123456789\n身分證：A123456789');
  expect(result.ok && result.value.map((c) => c.handling)).toEqual(['BLOCK_EXPORT', 'TOKENIZE']);
});
