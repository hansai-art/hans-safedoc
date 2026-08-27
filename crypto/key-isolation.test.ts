import { describe, expect, it } from 'vitest';
import { aesGcmDecrypt, aesGcmEncrypt, deriveJobKey } from '@privacy-bridge/core';

describe('ACC-STR-005 client and job key isolation', () => {
  it('derives distinct client/job keys and rejects a wrapped key under another client', async () => {
    const root = new Uint8Array(32).fill(9);
    const aad = new TextEncoder().encode('key-wrap');
    const a = await deriveJobKey(root, 'client-a', 'job-a', 'PB/v1/job-wrap');
    const b = await deriveJobKey(root, 'client-b', 'job-a', 'PB/v1/job-wrap');
    const otherJob = await deriveJobKey(root, 'client-a', 'job-b', 'PB/v1/job-wrap');
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(otherJob);
    const envelope = aesGcmEncrypt(a, new Uint8Array(32).fill(3), aad);
    expect(() => aesGcmDecrypt(b, envelope, aad)).toThrow();
  });
});
