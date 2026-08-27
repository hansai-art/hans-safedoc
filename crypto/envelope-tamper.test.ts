import { expect, it } from 'vitest';
import { aesGcmDecrypt, aesGcmEncrypt } from '@privacy-bridge/core';
it('ACC-TOK-011 rejects ciphertext, tag, IV, and AAD tampering', () => {
  const key = new Uint8Array(32).fill(1),
    aad = new Uint8Array([2]),
    envelope = aesGcmEncrypt(key, new Uint8Array([3]), aad, new Uint8Array(12).fill(4));
  for (const field of ['ciphertext', 'authTag', 'iv'] as const) {
    const altered = { ...envelope, [field]: new Uint8Array(envelope[field]) };
    altered[field][0]! ^= 1;
    expect(() => aesGcmDecrypt(key, altered, aad)).toThrow();
  }
  expect(() => aesGcmDecrypt(key, envelope, new Uint8Array([9]))).toThrow();
});
