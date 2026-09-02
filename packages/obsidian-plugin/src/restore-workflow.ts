import { randomBytes } from 'node:crypto';
import { link, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  canonicalStringify,
  escapeResultMarkdown,
  RESULT_LIMIT,
  restoreText,
  resultHash,
  validateResultBytes,
  type SafeJobRecord,
} from '@privacy-bridge/core';
import { openReadOnlySource } from '../../document-formats/src/read-only-source.js';

export interface RestoreSafeResultFileInput {
  readonly sourcePath: string;
  readonly outputParent: string;
  readonly job: SafeJobRecord;
}

export interface RestoreDryRunReport {
  readonly status: 'READY_TO_RESTORE';
  readonly jobId: string;
  readonly packageHash: string;
  readonly sourceResultSha256: string;
  readonly findingCount: number;
  readonly checks: readonly string[];
}

async function validateRestoreSource(input: RestoreSafeResultFileInput) {
  if (extname(input.sourcePath).toLowerCase() !== '.json') throw new Error('PB-IMPORT-001');
  const source = await openReadOnlySource(input.sourcePath, { maxBytes: RESULT_LIMIT });
  const bytes = new Uint8Array(await source.read());
  const validated = validateResultBytes(bytes, {
    jobId: input.job.jobId,
    packageHash: input.job.packageHash,
    tokenKey: input.job.tokenKey,
    documentIds: new Set(input.job.documentIds),
    knownTokens: new Set(input.job.entities.map((entity) => entity.token)),
  });
  if (!validated.ok) throw new Error(validated.error.code);
  await source.recheck('before-staging-write');
  return { source, bytes, result: validated.value };
}

export async function dryRunSafeResultFile(
  input: RestoreSafeResultFileInput,
): Promise<RestoreDryRunReport> {
  const validated = await validateRestoreSource(input);
  return {
    status: 'READY_TO_RESTORE',
    jobId: input.job.jobId,
    packageHash: input.job.packageHash,
    sourceResultSha256: resultHash(validated.bytes),
    findingCount: (validated.result.findings as readonly unknown[]).length,
    checks: [
      'UTF-8 JSON 與 result-package.schema.json',
      'Job ID 與 Safe Package Hash',
      '匿名 Document ID',
      '所有 Token 的格式、HMAC 與本機 Mapping',
      'Result JSON 在驗證期間未變更',
    ],
  };
}

export function explainRestoreError(code: string): string {
  if (code.includes('PB-IMPORT-001'))
    return 'Result JSON 格式或 Schema 不正確，請要求 AI 依 analysis-request.json 重新產生。';
  if (code.includes('PB-IMPORT-002'))
    return 'Result JSON 的 Job ID 或 Safe Package Hash 不符，請選擇原本配對的 Job。';
  if (code.includes('PB-IMPORT-003'))
    return '發現未知、被修改、偽造或來自其他 Job 的 Token，整包結果已拒絕。';
  if (code.includes('PB-IMPORT-005'))
    return 'Result JSON 超過大小、數量或結構深度限制，沒有建立還原副本。';
  if (code.includes('PB-FILE-004')) return 'Result JSON 在驗證期間發生變更，請重新選擇檔案。';
  return 'Result JSON 完整性驗證失敗，沒有建立還原副本。';
}

async function allocateResultRoot(outputParent: string, jobId: string): Promise<string> {
  await mkdir(outputParent, { recursive: true, mode: 0o700 });
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const name = suffix === 1 ? `${jobId}-results` : `${jobId}-results-${suffix}`;
    const path = join(outputParent, name);
    try {
      await mkdir(path, { mode: 0o700 });
      return path;
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== 'EEXIST') throw cause;
    }
  }
  throw new Error('無法建立不覆寫既有資料的還原資料夾。');
}

function restoreUntrustedText(value: string, job: SafeJobRecord): string {
  const restored = restoreText(
    escapeResultMarkdown(value),
    job.entities.map((entity) => ({
      token: entity.token,
      preferredDisplay: escapeResultMarkdown(entity.preferredDisplay),
    })),
  );
  if (!restored.ok) throw new Error(restored.error.code);
  return restored.value;
}

function renderFindingsMarkdown(result: Record<string, unknown>, job: SafeJobRecord): string {
  const lines = ['# Hans SafeDoc 還原結果', '', `Job：${job.jobId}`, ''];
  for (const finding of result.findings as Record<string, unknown>[]) {
    lines.push(
      `## ${String(finding.category)}`,
      '',
      restoreUntrustedText(String(finding.summary), job),
      '',
    );
    const evidence = (finding.evidence ?? []) as Record<string, unknown>[];
    if (evidence.length > 0) {
      lines.push('### 證據', '');
      for (const item of evidence)
        lines.push(`- ${restoreUntrustedText(String(item.excerpt), job)}`);
      lines.push('');
    }
  }
  return `${lines.join('\n')}\n`;
}

async function publishFile(root: string, name: string, bytes: Uint8Array): Promise<string> {
  const staging = join(root, `.${name}.${randomBytes(8).toString('hex')}.tmp`);
  const output = join(root, name);
  try {
    await writeFile(staging, bytes, { mode: 0o600, flag: 'wx' });
    if (resultHash(new Uint8Array(await readFile(staging))) !== resultHash(bytes))
      throw new Error('還原輸出重新驗證失敗。');
    await link(staging, output);
    await rm(staging, { force: true });
    if (resultHash(new Uint8Array(await readFile(output))) !== resultHash(bytes))
      throw new Error('還原輸出重新驗證失敗。');
    return output;
  } catch (cause) {
    await rm(staging, { force: true });
    throw cause;
  }
}

/** Validates one structured Result JSON and publishes a new Result Vault. */
export async function restoreSafeResultFile(input: RestoreSafeResultFileInput): Promise<string> {
  const validated = await validateRestoreSource(input);
  const { source, bytes } = validated;

  const markdown = new TextEncoder().encode(renderFindingsMarkdown(validated.result, input.job));
  const findingsJson = new TextEncoder().encode(`${canonicalStringify(validated.result)}\n`);
  const manifest = new TextEncoder().encode(
    `${canonicalStringify({
      schemaVersion: '1.0.0',
      jobId: input.job.jobId,
      sourcePackageHash: input.job.packageHash,
      sourceResultSha256: resultHash(bytes),
      findingsMarkdownSha256: resultHash(markdown),
      findingsJsonSha256: resultHash(findingsJson),
      createdAt: new Date().toISOString(),
    })}\n`,
  );
  const resultRoot = await allocateResultRoot(input.outputParent, input.job.jobId);
  try {
    const markdownFile = await publishFile(resultRoot, 'findings.md', markdown);
    await publishFile(resultRoot, 'findings.json', findingsJson);
    await publishFile(resultRoot, 'restore-manifest.json', manifest);
    await source.recheck('after-publish');
    return markdownFile;
  } catch (cause) {
    await rm(resultRoot, { recursive: true, force: true });
    throw cause;
  }
}
