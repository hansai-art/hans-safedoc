#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, process.argv[2] ?? 'artifacts/performance/synthetic-50mb-1000-notes');
const notes = 1000;
const targetBytes = 50 * 1024 * 1024;
const paragraph = '這是合成效能資料，絕不含真實個資。聯絡人：測試使用者，電話：0912-345-678。\n';
const bytesPerNote = Math.ceil(targetBytes / notes);
await mkdir(output, { recursive: true });
for (let index = 0; index < notes; index += 1) {
  const body = (
    `# Synthetic Note ${String(index + 1).padStart(4, '0')}\n\n` +
    paragraph.repeat(Math.ceil(bytesPerNote / Buffer.byteLength(paragraph)))
  ).slice(0, bytesPerNote);
  await writeFile(resolve(output, `${String(index + 1).padStart(4, '0')}.md`), body, 'utf8');
}
console.log(`Generated ${notes} synthetic Markdown notes at ${output}`);
