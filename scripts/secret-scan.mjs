#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter((path) => /^(packages|scripts)\//.test(path));
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:sk|gh[pousr])_[A-Za-z0-9_-]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /(?:AKIA|ASIA)[0-9A-Z]{16}/,
  /AIza[A-Za-z0-9_-]{35}/,
];
const findings = [];
for (const path of files) {
  const source = readFileSync(resolve(root, path), 'utf8');
  for (const pattern of patterns)
    if (pattern.test(source)) findings.push({ path, pattern: pattern.source });
}
if (findings.length > 0) {
  console.error(JSON.stringify({ findings }, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed: ${files.length} production files scanned.`);
}
