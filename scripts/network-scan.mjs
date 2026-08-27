#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

import { resolve } from 'node:path';

const denied = [
  'fetch(',
  'requestUrl(',
  'XMLHttpRequest',
  'WebSocket',
  'node:http',
  'node:https',
  'node:net',
  'node:tls',
  'node:dgram',
  'electron.session',
  'child_process',
];
const extensions = new Set(['.js', '.cjs', '.mjs', '.ts']);

function walk(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(resolve(path, entry.name)) : [resolve(path, entry.name)],
  );
}

export function scanProductionPaths(root) {
  const paths = [resolve(root, 'packages'), resolve(root, 'packages/obsidian-plugin/dist')]
    .flatMap(walk)
    .filter((path) => extensions.has(path.slice(path.lastIndexOf('.'))));
  return paths.flatMap((path) => {
    const source = readFileSync(path, 'utf8');
    return denied.filter((term) => source.includes(term)).map((term) => ({ path, term }));
  });
}

const root = resolve(import.meta.dirname, '..');
const findings = scanProductionPaths(root);
if (findings.length > 0) {
  console.error(
    JSON.stringify({ policy: 'No reachable production network API.', findings }, null, 2),
  );
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      policy: 'No reachable production network API.',
      scanned: 'packages + bundle',
    }),
  );
}
