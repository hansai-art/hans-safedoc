import { expect, it } from 'vitest';
import { detectAll, matchDictionary } from '@privacy-bridge/core';
it('ACC-REV-008 retains secret block risk when a dictionary overlaps it', () => {
  const source = 'password: secret123';
  const detected = detectAll(source);
  const dictionary = matchDictionary(source, {
    entries: [{ term: 'secret123', type: 'CUSTOM_TERM' }],
  });
  expect(detected.ok && detected.value[0]?.handling).toBe('BLOCK_EXPORT');
  expect(dictionary[0]?.primaryType).toBe('CUSTOM_TERM');
});
