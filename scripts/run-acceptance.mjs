import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const matrixPath = resolve(root, 'docs/ACCEPTANCE-MATRIX.csv');
const lockedPaths = ['docs/ACCEPTANCE-MATRIX.csv', 'docs/TRACEABILITY.csv'];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      value += char;
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((field) => field.length > 0)) rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  row.push(value);
  if (row.some((field) => field.length > 0)) rows.push(row);
  const [headers, ...data] = rows;
  return data.map((fields) =>
    Object.fromEntries(headers.map((header, i) => [header, fields[i] ?? ''])),
  );
}

function fail(message) {
  throw new Error(`Acceptance integrity failure: ${message}`);
}

function assertLockedFilesUntouched() {
  const result = spawnSync('git', ['diff', '--quiet', '--', ...lockedPaths], { cwd: root });
  if (result.status !== 0) fail(`locked file modified: ${lockedPaths.join(', ')}`);
}

function readTarget(row) {
  const target = row['Automated Test'];
  const id = row['Acceptance ID'];
  const scenario = row['Scenario / Input'];
  const expected = row['Expected Result'];
  if (!id || !target || !scenario || !expected)
    fail(`incomplete automated row ${id || '<unknown>'}`);
  const path = resolve(root, target);
  if (relative(root, path).startsWith('..')) fail(`${id} has unsafe target ${target}`);
  if (!existsSync(path)) fail(`${id} target absent: ${target}`);
  const source = readFileSync(path, 'utf8');
  const metadataLine = source.match(/^\/\/ ACCEPTANCE_METADATA (.+)$/mu);
  if (!metadataLine) fail(`${id} has no acceptance metadata in ${target}`);
  let metadata;
  try {
    metadata = JSON.parse(metadataLine[1]);
  } catch {
    fail(`${id} has invalid acceptance metadata in ${target}`);
  }
  if (metadata.id !== id) fail(`${id} absent from metadata in ${target}`);
  if (metadata.scenario !== scenario) fail(`${id} scenario text is not represented in ${target}`);
  if (metadata.expected !== expected) fail(`${id} expected text is not represented in ${target}`);
  if (!new RegExp(`it\\(\\s*['\"]${id}:`, 'u').test(source))
    fail(`${id} absent from the test name in ${target}`);
  if (/from\s+['"][^'"]*(?:tests\/core|foundation\/e\d+|hardening)[^'"]*['"]/u.test(source))
    fail(`${id} uses generic shared coverage in ${target}`);
  return { id, target, scenario, expected };
}

assertLockedFilesUntouched();
const rows = parseCsv(readFileSync(matrixPath, 'utf8').replace(/^\uFEFF/u, ''));
const seenIds = new Set();
const seenTargets = new Set();
const evidence = rows.map((row) => {
  const target = readTarget(row);
  if (seenIds.has(target.id)) fail(`duplicate ACC ID ${target.id}`);
  if (seenTargets.has(target.target)) fail(`duplicate generic target ${target.target}`);
  seenIds.add(target.id);
  seenTargets.add(target.target);
  return target;
});

const result = spawnSync('pnpm', ['exec', 'vitest', 'run', ...evidence.map((row) => row.target)], {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (result.status !== 0) {
  process.stderr.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  process.exit(result.status ?? 1);
}

assertLockedFilesUntouched();
const evidencePath = resolve(root, 'artifacts/acceptance-evidence.json');
mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(
  evidencePath,
  `${JSON.stringify({ generatedFrom: 'exact acceptance test metadata', rows: evidence }, null, 2)}\n`,
);
chmodSync(evidencePath, 0o444);
console.log(`AUTOMATED EVIDENCE PASS ${evidence.length}/${rows.length} exact acceptance targets`);
console.log(`Read-only evidence: ${relative(root, evidencePath)}`);
console.log('Manual platform Gate D evidence remains PENDING.');
