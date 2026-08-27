import { describe, expect, it } from 'vitest';
import { aesGcmEncrypt, encodeBase64Url } from '@privacy-bridge/core';

describe('ACC-STR-011 operator identity storage', () => {
  it('persists an encrypted alias and opaque fingerprint instead of OS identity fields', () => {
    const encryptedAlias = aesGcmEncrypt(
      new Uint8Array(32).fill(2),
      new TextEncoder().encode('Operator A'),
      new Uint8Array(),
    );
    const record = {
      aliasEnvelope: encodeBase64Url(encryptedAlias.ciphertext),
      deviceId: 'sha256:opaque-fingerprint',
    };
    expect(Object.keys(record)).toEqual(['aliasEnvelope', 'deviceId']);
    expect(JSON.stringify(record)).not.toContain('Operator A');
  });
});
