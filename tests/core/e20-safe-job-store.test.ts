import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listSafeJobRecords,
  loadSafeJobRecord,
  restoreText,
  saveSafeJobRecord,
} from '@privacy-bridge/core';
import {
  prepareReviewedDocument,
  scanSyntheticDocument,
} from '../../packages/obsidian-plugin/src/workflow.js';

const PASSPHRASE = 'correct horse battery staple';

function prepare(source: string) {
  const scanned = scanSyntheticDocument(source);
  if (!scanned.ok) throw new Error(scanned.error.code);
  const decisions = Object.fromEntries(
    scanned.value.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
  );
  const prepared = prepareReviewedDocument(source, scanned.value, decisions);
  if (!prepared.ok) throw new Error(prepared.error.code);
  return prepared.value;
}

describe('E20 encrypted Safe Job Store', () => {
  it('persists only encrypted mapping data and restores the matching Job', async () => {
    const secureRoot = await mkdtemp(join(tmpdir(), 'hans-safedoc-job-'));
    const source = '聯絡電話：0912-345-678\n信箱：demo@example.invalid\n';
    const prepared = prepare(source);
    expect(prepared.jobId).toMatch(/^PB-[0-9]{8}-[0-9A-HJKMNP-TV-Z]{10}$/u);

    const saved = await saveSafeJobRecord({
      secureRoot,
      jobId: prepared.jobId,
      createdAt: '2026-09-01T00:00:00.000Z',
      sourceSha256: prepared.sourceSha256,
      packageHash: 'a'.repeat(64),
      documentIds: [prepared.documentId],
      tokenKey: prepared.tokenKey,
      entities: prepared.mapping,
      passphrase: PASSPHRASE,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    const recordPath = join(secureRoot, 'jobs', prepared.jobId, 'mapping.hsdjob');
    const stored = await readFile(recordPath, 'utf8');
    expect(stored).not.toContain('0912-345-678');
    expect(stored).not.toContain('demo@example.invalid');
    expect(stored).not.toContain('tokenKey');
    if (process.platform !== 'win32') {
      expect((await stat(recordPath)).mode & 0o777).toBe(0o600);
      expect((await stat(join(secureRoot, 'jobs', prepared.jobId))).mode & 0o777).toBe(0o700);
    }

    const listed = await listSafeJobRecords(secureRoot);
    expect(listed).toEqual({
      ok: true,
      value: [{ jobId: prepared.jobId, createdAt: '2026-09-01T00:00:00.000Z' }],
    });

    const loaded = await loadSafeJobRecord(secureRoot, prepared.jobId, PASSPHRASE);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.sourceSha256).toBe(prepared.sourceSha256);
    expect(loaded.value.packageHash).toBe('a'.repeat(64));
    expect(loaded.value.documentIds).toEqual([prepared.documentId]);
    const restored = restoreText(prepared.sanitizedContent, loaded.value.entities);
    expect(restored).toEqual({ ok: true, value: source });
    loaded.value.tokenKey.fill(0);
  });

  it('rejects the wrong passphrase, record tampering, and accidental overwrite', async () => {
    const secureRoot = await mkdtemp(join(tmpdir(), 'hans-safedoc-job-tamper-'));
    const prepared = prepare('電話：0912-345-678');
    const input = {
      secureRoot,
      jobId: prepared.jobId,
      sourceSha256: prepared.sourceSha256,
      packageHash: 'b'.repeat(64),
      documentIds: [prepared.documentId],
      tokenKey: prepared.tokenKey,
      entities: prepared.mapping,
      passphrase: PASSPHRASE,
      createdAt: '2026-09-01T00:00:00.000Z',
    } as const;
    expect((await saveSafeJobRecord(input)).ok).toBe(true);
    expect((await saveSafeJobRecord(input)).ok).toBe(false);
    expect((await loadSafeJobRecord(secureRoot, prepared.jobId, 'wrong password value')).ok).toBe(
      false,
    );

    const recordPath = join(secureRoot, 'jobs', prepared.jobId, 'mapping.hsdjob');
    const envelope = JSON.parse(await readFile(recordPath, 'utf8')) as {
      cipher: { ciphertext: string };
    };
    envelope.cipher.ciphertext = `${envelope.cipher.ciphertext.slice(0, -1)}A`;
    await writeFile(recordPath, JSON.stringify(envelope), { mode: 0o600 });
    expect((await loadSafeJobRecord(secureRoot, prepared.jobId, PASSPHRASE)).ok).toBe(false);
  });
});
