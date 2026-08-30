#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
for (const [command, args] of [
  ['pnpm', ['install', '--frozen-lockfile', '--ignore-scripts']],
  ['pnpm', ['run', 'build']],
  ['pnpm', ['run', 'validate:schemas']],
  ['pnpm', ['run', 'sbom']],
  ['pnpm', ['run', 'release:artifact']],
]) {
  execFileSync(command, args, { cwd: root, stdio: 'inherit' });
}
console.log(
  'Clean-machine reproducibility sequence passed. Run this in a fresh macOS and Windows profile for Gate D evidence.',
);
