import { copyFile, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  openExternalReviewDocument,
  publishExternalReviewedDocument,
} from '../../packages/obsidian-plugin/src/external-format-workflow.js';
import { prepareReviewedDocument } from '../../packages/obsidian-plugin/src/workflow.js';
import type { RecheckPoint } from '../../packages/document-formats/src/read-only-source.js';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'hans-safedoc-'));
  temporaryDirectories.push(path);
  return path;
}

describe('external format workflow safety gates', () => {
  it.each([
    ['docx', 'messy-minimal.docx'],
    ['xlsx', 'messy-formula-free.xlsx'],
  ])(
    'opens, reviews and publishes an admitted .%s while preserving the source hash',
    async (extension, fixture) => {
      const root = await temporaryDirectory();
      const sourcePath = join(root, `synthetic.${extension}`);
      const outputParent = join(root, 'outputs');
      await copyFile(
        new URL(`../fixtures/document-formats/${fixture}`, import.meta.url),
        sourcePath,
      );
      const before = createHash('sha256')
        .update(await readFile(sourcePath))
        .digest('hex');

      const opened = await openExternalReviewDocument(sourcePath);
      expect(opened.status).toBe('READY');
      if (opened.status !== 'READY') return;
      expect(opened.document.kind).toBe(extension);
      expect(opened.document.candidates.length).toBeGreaterThan(0);
      expect(opened.document.mandatoryReviewRecords.length).toBeGreaterThan(0);

      const prepared = prepareReviewedDocument(
        opened.document.sourceContent,
        opened.document.candidates,
        Object.fromEntries(
          opened.document.candidates.map((candidate) => [
            candidate.candidateId,
            'ACCEPTED' as const,
          ]),
        ),
      );
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) return;
      await expect(
        publishExternalReviewedDocument({
          document: opened.document,
          prepared: prepared.value,
          mandatoryReviewIds: [],
          outputParent,
        }),
      ).rejects.toThrow(/強制人工確認/);

      const output = await publishExternalReviewedDocument({
        document: opened.document,
        prepared: prepared.value,
        mandatoryReviewIds: opened.document.mandatoryReviewRecords.map((record) => record.id),
        outputParent,
      });
      expect(output).toMatch(new RegExp(`hans-safedoc-[a-f0-9]{10}\\.${extension}$`, 'u'));
      expect(
        createHash('sha256')
          .update(await readFile(sourcePath))
          .digest('hex'),
      ).toBe(before);
    },
    60_000,
  );

  it('rejects a prepared review from another source before creating an output directory', async () => {
    const root = await temporaryDirectory();
    const sourcePath = join(root, 'source.txt');
    const outputParent = join(root, 'outputs');
    await writeFile(sourcePath, '聯絡電話：0912-345-678\n');
    const opened = await openExternalReviewDocument(sourcePath);
    expect(opened.status).toBe('READY');
    if (opened.status !== 'READY') return;
    const stalePrepared = prepareReviewedDocument(opened.document.sourceContent, [], {});
    expect(stalePrepared.ok).toBe(true);
    if (!stalePrepared.ok) return;

    await expect(
      publishExternalReviewedDocument({
        document: opened.document,
        prepared: stalePrepared.value,
        outputParent,
      }),
    ).rejects.toThrow(/審核預覽不屬於目前來源/);
    await expect(readdir(outputParent)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(sourcePath, 'utf8')).toBe('聯絡電話：0912-345-678\n');
  });

  it('stops a changed source before staging an artifact', async () => {
    const root = await temporaryDirectory();
    const sourcePath = join(root, 'source.txt');
    const outputParent = join(root, 'outputs');
    await writeFile(sourcePath, '聯絡電話：0912-345-678\n');
    const opened = await openExternalReviewDocument(sourcePath);
    expect(opened.status).toBe('READY');
    if (opened.status !== 'READY') return;
    const prepared = prepareReviewedDocument(
      opened.document.sourceContent,
      opened.document.candidates,
      Object.fromEntries(
        opened.document.candidates.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
      ),
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    await writeFile(sourcePath, '聯絡電話：0912-345-679\n');

    await expect(
      publishExternalReviewedDocument({
        document: opened.document,
        prepared: prepared.value,
        outputParent,
      }),
    ).rejects.toThrow(/Source bytes changed at before-rewrite/);
    await expect(readdir(outputParent)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('cleans the staging artifact when cancellation happens before publish', async () => {
    const root = await temporaryDirectory();
    const sourcePath = join(root, 'source.txt');
    const outputParent = join(root, 'outputs');
    await writeFile(sourcePath, '聯絡電話：0912-345-678\n');
    const opened = await openExternalReviewDocument(sourcePath);
    expect(opened.status).toBe('READY');
    if (opened.status !== 'READY') return;
    const prepared = prepareReviewedDocument(
      opened.document.sourceContent,
      opened.document.candidates,
      Object.fromEntries(
        opened.document.candidates.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
      ),
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const document = {
      ...opened.document,
      source: {
        ...opened.document.source,
        recheck: async (point: RecheckPoint) => {
          if (point === 'before-publish') throw new Error('publish cancelled');
          return opened.document.source.recheck(point);
        },
      },
    };

    await expect(
      publishExternalReviewedDocument({ document, prepared: prepared.value, outputParent }),
    ).rejects.toThrow(/publish cancelled/);
    expect(await readdir(outputParent)).toEqual([]);
  });

  it('removes the public artifact when the after-publish source recheck fails', async () => {
    const root = await temporaryDirectory();
    const sourcePath = join(root, 'source.txt');
    const outputParent = join(root, 'outputs');
    await writeFile(sourcePath, 'Email: final@example.com');
    const opened = await openExternalReviewDocument(sourcePath);
    expect(opened.status).toBe('READY');
    if (opened.status !== 'READY') return;
    const prepared = prepareReviewedDocument(
      opened.document.sourceContent,
      opened.document.candidates,
      Object.fromEntries(
        opened.document.candidates.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
      ),
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const document = {
      ...opened.document,
      source: {
        ...opened.document.source,
        recheck: async (point: RecheckPoint) => {
          if (point === 'after-publish') throw new Error('source changed after publish');
          return opened.document.source.recheck(point);
        },
      },
    };

    await expect(
      publishExternalReviewedDocument({ document, prepared: prepared.value, outputParent }),
    ).rejects.toThrow(/source changed after publish/);
    expect(await readdir(outputParent)).toEqual([]);
  });

  it('automatically detects and preserves an unambiguous semicolon dialect', async () => {
    const root = await temporaryDirectory();
    const sourcePath = join(root, 'source.csv');
    await writeFile(sourcePath, 'name;email\n測試;case.alpha@example.invalid\n');

    const opened = await openExternalReviewDocument(sourcePath);
    expect(opened.status).toBe('READY');
    if (opened.status !== 'READY') return;
    expect(opened.document.csvDialect?.delimiter).toBe(';');
    expect(
      opened.document.candidates.some(
        (candidate) => candidate.surfaceText === 'case.alpha@example.invalid',
      ),
    ).toBe(true);
  });

  it.each([
    ['Inconsistent CSV column count', '每一列的欄位數不同'],
    ['CSV active content blocked', '可能被試算表執行的公式'],
    ['Malformed CSV quote', '引號沒有成對'],
    ['HSD-ENC-101: UTF-16 is unsupported', '另存成 UTF-8'],
    ['HSD-ENC-100: source is not strict UTF-8', '不是 UTF-8 編碼'],
    ['HSD-ENC-104: unsafe C0/C1 control is unsupported', '不安全的隱藏控制字元'],
    ['OOXML blocked: xlsx-formula', '公式或計算結構'],
    ['OOXML blocked: tracked-change', '註解或修訂紀錄'],
    ['OOXML blocked: macro-content-type', '巨集、嵌入物件、外部資料或進階功能'],
    ['OOXML blocked: zip-resource-limit', '已損壞、加密、過大或壓縮結構不安全'],
    ['OOXML blocked: unknown-part:word/unknown.xml', '尚未安全驗證的結構'],
  ])('turns %s into a novice-facing recovery message', async (message, expected) => {
    const { explainExternalFileError } =
      await import('../../packages/obsidian-plugin/src/external-format-workflow.js');
    expect(explainExternalFileError(new Error(message))).toContain(expected);
  });

  it('publishes an opaque non-overwriting TXT artifact after staged read-back and residual checks', async () => {
    const root = await temporaryDirectory();
    const sourcePath = join(root, 'private-customer-name.txt');
    const outputParent = join(root, 'outputs');
    const original = '聯絡電話：0912-345-678\n';
    await writeFile(sourcePath, original);

    const opened = await openExternalReviewDocument(sourcePath);
    expect(opened.status).toBe('READY');
    if (opened.status !== 'READY') return;
    const decisions = Object.fromEntries(
      opened.document.candidates.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
    );
    const prepared = prepareReviewedDocument(
      opened.document.sourceContent,
      opened.document.candidates,
      decisions,
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    const first = await publishExternalReviewedDocument({
      document: opened.document,
      prepared: prepared.value,
      outputParent,
    });
    const second = await publishExternalReviewedDocument({
      document: opened.document,
      prepared: prepared.value,
      outputParent,
    });

    expect(first).not.toBe(second);
    expect(first).toMatch(/hans-safedoc-[a-f0-9]{10}\.txt$/u);
    expect(first).not.toContain('private-customer-name');
    expect(await readFile(sourcePath, 'utf8')).toBe(original);
    expect(await readFile(first, 'utf8')).not.toContain('0912-345-678');
    expect(await readFile(second, 'utf8')).not.toContain('0912-345-678');
  });
});
