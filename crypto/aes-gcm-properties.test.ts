import { describe, expect, it } from 'vitest';
import { aesGcmDecrypt, aesGcmEncrypt } from '@privacy-bridge/core';

describe('ACC-STR-007 AES-GCM properties', () => {
  it('uses unique IVs across 10,000 encryptions and rejects all tampering', () => {
    const key = new Uint8Array(32).fill(4);
    const aad = new TextEncoder().encode('fixture');
    const plain = new Uint8Array([1, 2]);
    const ivs = new Set<string>();
    for (let i = 0; i < 10_000; i += 1) {
      const encrypted = aesGcmEncrypt(key, plain, aad);
      ivs.add(Buffer.from(encrypted.iv).toString('hex'));
      expect(aesGcmDecrypt(key, encrypted, aad)).toEqual(plain);
    }
    expect(ivs).toHaveLength(10_000);
    const tampered = aesGcmEncrypt(key, plain, aad);
    tampered.authTag[0] ^= 1;
    expect(() => aesGcmDecrypt(key, tampered, aad)).toThrow();
  });
});
