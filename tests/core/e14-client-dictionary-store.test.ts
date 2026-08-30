import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decryptClientDictionary,
  encryptClientDictionary,
  loadClientDictionary,
  saveClientDictionary,
} from '../../packages/core/src/client-dictionary-store.js';
import dictionary from '../../examples/dictionary.example.json' with { type: 'json' };

const context = {
  storeId: '22222222-2222-4222-8222-222222222222',
  clientId: '11111111-1111-4111-8111-111111111111',
  keyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
} as const;
const key = new Uint8Array(32).fill(7);

describe('E14 encrypted client dictionary store', () => {
  it('validates, encrypts, authenticates, and rejects changed AAD', () => {
    const encrypted = encryptClientDictionary(dictionary, key, context, '2026-08-28T00:00:00Z');
    expect(encrypted.ok).toBe(true);
    if (!encrypted.ok) return;
    expect(new TextDecoder().decode(encrypted.value)).not.toContain('星河科技');
    const decrypted = decryptClientDictionary(encrypted.value, key, context);
    expect(decrypted.ok).toBe(true);
    if (!decrypted.ok) return;
    expect(decrypted.value).toEqual(dictionary);

    const envelope = JSON.parse(new TextDecoder().decode(encrypted.value)) as {
      aad: { storeId: string };
    };
    envelope.aad.storeId = '33333333-3333-4333-8333-333333333333';
    const tampered = decryptClientDictionary(
      new TextEncoder().encode(JSON.stringify(envelope)),
      key,
      context,
    );
    expect(tampered.ok).toBe(false);
    if (!tampered.ok) expect(tampered.error.code).toBe('PB-CRYPTO-002');
  });

  it('atomically saves dictionary.enc outside the Vault and reads it back', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-dictionary-store-'));
    const saved = await saveClientDictionary({
      storeRoot: root,
      dictionary,
      key,
      context,
      createdAt: '2026-08-28T00:00:00Z',
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value).toBe(join(root, 'clients', context.clientId, 'dictionary.enc'));
    if (process.platform !== 'win32') {
      expect((await stat(saved.value)).mode & 0o777).toBe(0o600);
    }
    expect(await readFile(saved.value, 'utf8')).not.toContain('星河科技');
    const loaded = await loadClientDictionary(saved.value, key, context);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.value).toEqual(dictionary);
  });

  it('writes nothing when the dictionary contract is invalid', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pb-dictionary-invalid-'));
    const saved = await saveClientDictionary({
      storeRoot: root,
      dictionary: { entries: [{ term: '測試使用者' }] },
      key,
      context,
      createdAt: '2026-08-28T00:00:00Z',
    });
    expect(saved.ok).toBe(false);
    await expect(stat(join(root, 'clients', context.clientId, 'dictionary.enc'))).rejects.toThrow();
  });
});
