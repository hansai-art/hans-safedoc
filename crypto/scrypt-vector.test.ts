import { describe, expect, it } from 'vitest';
import { deriveScryptKey } from '@privacy-bridge/core';
import vector from '../examples/crypto-test-vectors.json' with { type: 'json' };

describe('ACC-STR-006 fixed scrypt vector', () => {
  it('matches the shipped deterministic cross-platform vector', async () => {
    const key = await deriveScryptKey(
      vector.inputs.passphrase,
      new Uint8Array(Buffer.from(vector.inputs.scryptSaltHex, 'hex')),
    );
    expect(Buffer.from(key).toString('hex')).toBe(vector.expected.scryptKekHex);
  });
});
