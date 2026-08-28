import { describe, expect, it } from 'vitest';
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  deriveClientKey,
  deriveJobKey,
  deriveScryptKey,
  encodeBase64Url,
  tokenFor,
  validatePassphrase,
} from '@privacy-bridge/core';
import vector from '../../examples/crypto-test-vectors.json' with { type: 'json' };

const bytes = (hex: string) => new Uint8Array(Buffer.from(hex, 'hex'));
const utf8 = (value: string) => new TextEncoder().encode(value);

describe('E02 cryptographic primitives', () => {
  it('derives the locked client dictionary key from store and client identity', async () => {
    const key = await deriveClientKey(
      new Uint8Array(Array.from({ length: 32 }, (_, index) => index)),
      '123e4567-e89b-42d3-a456-426614174000',
      '123e4567-e89b-42d3-a456-426614174001',
      'PB/v1/dictionary',
    );
    expect(Buffer.from(key).toString('hex')).toBe(
      '12fbe9083c38debe60aaba309d3c469ff2446581fa88eb6723615321977c2f5b',
    );
  });
  it('matches the locked scrypt, HKDF, AES-GCM, and token vectors', async () => {
    const kek = await deriveScryptKey(vector.inputs.passphrase, bytes(vector.inputs.scryptSaltHex));
    expect(Buffer.from(kek).toString('hex')).toBe(vector.expected.scryptKekHex);
    const jobKey = await deriveJobKey(
      bytes(vector.inputs.clientRootKeyHex),
      vector.inputs.clientId,
      vector.inputs.jobId,
      'PB/v1/job-wrap',
    );
    expect(Buffer.from(jobKey).toString('hex')).toBe(vector.expected.jobWrapKeyHex);
    const dataKey = await deriveJobKey(
      bytes(vector.inputs.jobRootKeyHex),
      vector.inputs.clientId,
      vector.inputs.jobId,
      'PB/v1/job-data',
    );
    const encrypted = aesGcmEncrypt(
      dataKey,
      utf8(vector.inputs.dataPlaintextUtf8),
      utf8(vector.inputs.dataAadUtf8),
      bytes(vector.inputs.dataIvHex),
    );
    expect(encodeBase64Url(encrypted.ciphertext)).toBe(vector.expected.dataCiphertextBase64url);
    expect(encodeBase64Url(encrypted.authTag)).toBe(vector.expected.dataAuthTagBase64url);
    expect(
      tokenFor(
        await deriveJobKey(
          bytes(vector.inputs.jobRootKeyHex),
          vector.inputs.clientId,
          vector.inputs.jobId,
          'PB/v1/token-auth',
        ),
        vector.inputs.jobId,
        'PERSON',
        vector.expected.entityIdCrockford,
      ),
    ).toBe(vector.expected.token);
  });

  it('rejects tamper and preserves byte-distinct passphrases', async () => {
    const key = new Uint8Array(32).fill(1);
    const iv = new Uint8Array(12).fill(2);
    const envelope = aesGcmEncrypt(key, utf8('safe'), utf8('aad'), iv);
    envelope.ciphertext[0]! ^= 1;
    expect(() => aesGcmDecrypt(key, envelope, utf8('aad'))).toThrow();
    expect(await deriveScryptKey('é'.repeat(12), new Uint8Array(16))).not.toEqual(
      await deriveScryptKey('e\u0301'.repeat(12), new Uint8Array(16)),
    );
  });

  it('enforces the exact code-point passphrase policy', () => {
    expect(validatePassphrase('a'.repeat(11)).ok).toBe(false);
    expect(validatePassphrase('😀'.repeat(12)).ok).toBe(true);
    expect(validatePassphrase('a'.repeat(257)).ok).toBe(false);
  });
});
