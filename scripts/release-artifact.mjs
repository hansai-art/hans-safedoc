#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const pluginDist = resolve(root, 'packages/obsidian-plugin/dist');
const outdir = resolve(root, 'artifacts/release');
const encoder = new TextEncoder();
const u16 = (value) => Buffer.from([value & 255, (value >>> 8) & 255]);
const u32 = (value) =>
  Buffer.from([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function buildReleaseZip(entries) {
  const local = [],
    central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name),
      crc = crc32(entry.bytes);
    const body = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(entry.bytes.length),
      u32(entry.bytes.length),
      u16(name.length),
      u16(0),
      name,
      entry.bytes,
    ]);
    local.push(body);
    central.push(
      Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x01, 0x02]),
        u16(0x0314),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(entry.bytes.length),
        u32(entry.bytes.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += body.length;
  }
  const directory = Buffer.concat(central);
  return Buffer.concat([
    ...local,
    directory,
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(directory.length),
    u32(offset),
    u16(0),
  ]);
}
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
const artifactManifest = {
  sourceCommit,
  files: checksums,
  sbom: '../../artifacts/sbom.cdx.json',
};
await writeFile(
  resolve(outdir, 'artifact-manifest.json'),
  `${JSON.stringify(artifactManifest, null, 2)}\n`,
);
await cp(resolve(root, 'artifacts/sbom.cdx.json'), resolve(outdir, 'sbom.cdx.json'));
const releaseFiles = (await readdir(outdir)).sort();
const releaseChecksums = Object.fromEntries(
  await Promise.all(
    releaseFiles.map(async (name) => [
      name,
      createHash('sha256')
        .update(await readFile(resolve(outdir, name)))
        .digest('hex'),
    ]),
  ),
);
await writeFile(
  resolve(outdir, 'SHA256SUMS.txt'),
  `${Object.entries(releaseChecksums)
    .map(([name, hash]) => `${hash}  ${name}`)
    .join('\n')}\n`,
);
const persisted = JSON.parse(await readFile(resolve(outdir, 'artifact-manifest.json'), 'utf8'));
if (persisted.sourceCommit !== sourceCommit)
  throw new Error('Release artifact source commit mismatch.');
for (const [name, hash] of Object.entries(checksums))
  if (
    createHash('sha256')
      .update(await readFile(resolve(outdir, name)))
      .digest('hex') !== hash
  )
    throw new Error(`Release artifact checksum mismatch: ${name}`);
const sbom = JSON.parse(await readFile(resolve(outdir, 'sbom.cdx.json'), 'utf8'));
if (sbom.bomFormat !== 'CycloneDX' || !Array.isArray(sbom.components))
  throw new Error('Release artifact SBOM is invalid.');
const archiveEntries = await Promise.all(
  (await readdir(outdir))
    .sort()
    .map(async (name) => ({ name, bytes: await readFile(resolve(outdir, name)) })),
);
const archive = buildReleaseZip(archiveEntries);
await writeFile(resolve(outdir, 'privacy-bridge-alpha.zip'), archive);
const readBackArchive = await readFile(resolve(outdir, 'privacy-bridge-alpha.zip'));
if (
  !readBackArchive.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
  !readBackArchive.subarray(-22, -18).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
)
  throw new Error('Release archive validation failed.');
console.log(`Release artifact prepared and read-back validated in ${outdir}`);
