import { describe, expect, it } from 'vitest';
import { aesGcmDecrypt, aesGcmEncrypt } from '@privacy-bridge/core';

describe('ACC-STR-004 dictionary encryption', () => {
  it('encrypts imported dictionary bytes with authenticated encryption outside the Vault', () => {
    const key = new Uint8Array(32).fill(1);
    const plain = new TextEncoder().encode('{"alias":"Client A"}');
    const encrypted = aesGcmEncrypt(key, plain, new TextEncoder().encode('dictionary'));
    expect(Buffer.concat([encrypted.ciphertext, encrypted.authTag]).toString()).not.toContain(
      'Client A',
    );
    expect(aesGcmDecrypt(key, encrypted, new TextEncoder().encode('dictionary'))).toEqual(plain);
  });
});
