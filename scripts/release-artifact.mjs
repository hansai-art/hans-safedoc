#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const pluginDist = resolve(root, 'packages/obsidian-plugin/dist');
const outdir = resolve(root, 'artifacts/release');
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
for (const name of ['main.js', 'manifest.json'])
  await cp(resolve(pluginDist, name), resolve(outdir, name));
const files = ['main.js', 'manifest.json'];
const checksums = Object.fromEntries(
  await Promise.all(
    files.map(async (name) => [
      name,
      createHash('sha256')
        .update(await readFile(resolve(outdir, name)))
        .digest('hex'),
    ]),
  ),
);
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
await writeFile(
  resolve(outdir, 'artifact-manifest.json'),
  `${JSON.stringify(
    {
      sourceCommit,
      files: checksums,
      sbom: '../../artifacts/sbom.cdx.json',
    },
    null,
    2,
  )}\n`,
);
console.log(`Release artifact prepared in ${outdir}`);
