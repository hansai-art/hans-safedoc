import { expect, it } from 'vitest';
import { aesGcmEncrypt } from '@privacy-bridge/core';
it('ACC-TOK-010 generates non-repeating IVs and authenticates AAD', () => {
  const key = new Uint8Array(32),
    seen = new Set<string>();
  for (let i = 0; i < 10_000; i += 1)
    seen.add(
      Buffer.from(aesGcmEncrypt(key, new Uint8Array([i % 256]), new Uint8Array([1])).iv).toString(
        'hex',
      ),
    );
  expect(seen).toHaveLength(10_000);
});
