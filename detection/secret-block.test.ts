import { expect, it } from 'vitest';
import { detectAll, validateCandidateHandling } from '@privacy-bridge/core';
it('ACC-DET-017 blocks secret fixtures and rejects reversible tokenization', () => {
  const result = detectAll('api_key: sk-abcdefghijklmnopqrstuvwxyz123456');
  expect(result.ok && result.value[0]?.handling).toBe('BLOCK_EXPORT');
  expect(result.ok && !validateCandidateHandling(result.value[0]!, 'TOKENIZE').ok).toBe(true);
});
