import { mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  dryRunSafeResultFile,
  explainRestoreError,
  restoreSafeResultFile,
} from '../../packages/obsidian-plugin/src/restore-workflow.js';
import {
  prepareReviewedDocument,
  scanSyntheticDocument,
} from '../../packages/obsidian-plugin/src/workflow.js';

function preparedSource() {
  const source = '聯絡電話：0912-345-678\n';
  const scanned = scanSyntheticDocument(source);
  if (!scanned.ok) throw new Error(scanned.error.code);
  const prepared = prepareReviewedDocument(
    source,
    scanned.value,
    Object.fromEntries(
      scanned.value.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
    ),
  );
  if (!prepared.ok) throw new Error(prepared.error.code);
  return prepared.value;
}

function resultPackage(
  prepared: ReturnType<typeof preparedSource>,
  packageHash: string,
  summary: string,
) {
  return {
    schemaVersion: '1.0.0',
    jobId: prepared.jobId,
    sourcePackageHash: packageHash,
    createdAt: '2026-09-01T00:00:00.000Z',
    producer: 'Synthetic Analyzer',
    findings: [
      {
        findingId: '223e4567-e89b-42d3-a456-426614174000',
        entityRefs: [prepared.mapping[0]!.token],
        category: 'contact',
        summary,
        sourceDocumentIds: [prepared.documentId],
        evidence: [{ documentId: prepared.documentId, excerpt: prepared.mapping[0]!.token }],
      },
    ],
  };
}

function job(prepared: ReturnType<typeof preparedSource>, packageHash: string) {
  return {
    jobId: prepared.jobId,
    createdAt: '2026-09-01T00:00:00.000Z',
    sourceSha256: prepared.sourceSha256,
    packageHash,
    documentIds: [prepared.documentId],
    tokenKey: prepared.tokenKey,
    entities: prepared.mapping,
  };
}

describe('E20 structured Result restore workflow', () => {
  it('writes a verified Result Vault without modifying or overwriting the Result JSON', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hans-safedoc-restore-'));
    const resultPath = join(root, 'result.json');
    const outputParent = join(root, 'Hans SafeDoc Restored');
    const prepared = preparedSource();
    const packageHash = 'a'.repeat(64);
    const result = resultPackage(
      prepared,
      packageHash,
      `<script>bad()</script> [危險連結](obsidian://open) ${prepared.mapping[0]!.token}`,
    );
    const sourceJson = JSON.stringify(result);
    await writeFile(resultPath, sourceJson, 'utf8');

    const input = {
      sourcePath: resultPath,
      outputParent,
      job: job(prepared, packageHash),
    };
    const dryRun = await dryRunSafeResultFile(input);
    expect(dryRun).toMatchObject({
      status: 'READY_TO_RESTORE',
      jobId: prepared.jobId,
      findingCount: 1,
    });
    await expect(readdir(outputParent)).rejects.toThrow();
    const first = await restoreSafeResultFile(input);
    const second = await restoreSafeResultFile({
      sourcePath: resultPath,
      outputParent,
      job: job(prepared, packageHash),
    });

    expect(await readFile(resultPath, 'utf8')).toBe(sourceJson);
    expect(await readFile(first, 'utf8')).toContain('0912-345-678');
    expect(await readFile(first, 'utf8')).toContain('&lt;script&gt;');
    expect(await readFile(first, 'utf8')).toContain('\\[危險連結\\]');
    expect(await readFile(join(dirname(first), 'findings.json'), 'utf8')).toContain(
      prepared.mapping[0]!.token,
    );
    expect(await readFile(join(dirname(first), 'restore-manifest.json'), 'utf8')).toContain(
      packageHash,
    );
    expect(first).not.toBe(second);
    expect(await readdir(outputParent)).toHaveLength(2);
    if (process.platform !== 'win32') expect((await stat(first)).mode & 0o777).toBe(0o600);
  });

  it('fails before creating a Result Vault when a token is malformed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hans-safedoc-restore-invalid-'));
    const resultPath = join(root, 'result.json');
    const outputParent = join(root, 'Hans SafeDoc Restored');
    const prepared = preparedSource();
    const packageHash = 'b'.repeat(64);
    const token = prepared.mapping[0]!.token;
    await writeFile(
      resultPath,
      JSON.stringify(resultPackage(prepared, packageHash, `${token.slice(0, -2)}X⟧`)),
      'utf8',
    );

    await expect(
      restoreSafeResultFile({
        sourcePath: resultPath,
        outputParent,
        job: job(prepared, packageHash),
      }),
    ).rejects.toThrow('PB-IMPORT-003');
    await expect(readdir(outputParent)).rejects.toThrow();
    expect(explainRestoreError('PB-IMPORT-003')).toContain('未知、被修改、偽造或來自其他 Job');
  });
});
