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
  if (extname(input.sourcePath).toLowerCase() !== '.json')
    throw new Error('只接受符合 result-package.schema.json 的 UTF-8 JSON。');
  const source = await openReadOnlySource(input.sourcePath, { maxBytes: RESULT_LIMIT });
  const bytes = new Uint8Array(await source.read());
  const validated = validateResultBytes(bytes, {
    jobId: input.job.jobId,
    packageHash: input.job.packageHash,
    tokenKey: input.job.tokenKey,
    documentIds: new Set(input.job.documentIds),
    knownTokens: new Set(input.job.entities.map((entity) => entity.token)),
  });
  if (!validated.ok) throw new Error(`還原驗證失敗：${validated.error.code}`);
  await source.recheck('before-staging-write');

  const markdown = new TextEncoder().encode(renderFindingsMarkdown(validated.value, input.job));
  const findingsJson = new TextEncoder().encode(`${canonicalStringify(validated.value)}\n`);
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
