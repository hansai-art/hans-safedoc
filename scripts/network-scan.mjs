#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const denied = [
  'fetch(',
  'globalThis.fetch',
  'window.fetch',
  'requestUrl(',
  'XMLHttpRequest',
  'globalThis.XMLHttpRequest',
  'window.XMLHttpRequest',
  'WebSocket',
  'globalThis.WebSocket',
  'window.WebSocket',
  "'node:http'",
  '"node:http"',
  "'node:https'",
  '"node:https"',
  "'node:net'",
  '"node:net"',
  "'node:tls'",
  '"node:tls"',
  "'node:dgram'",
  '"node:dgram"',
  'electron.session',
  'child_process',
];
const inertMetadataPrefixes = [
  'https://json-schema.org/',
  'https://privacy-bridge.local/',
  'https://raw.githubusercontent.com/ajv-validator/ajv/',
  'https://web.dev/cross-origin-isolation-guide/',
];
const extensions = new Set(['.js', '.cjs', '.mjs', '.ts']);

function walk(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(resolve(path, entry.name)) : [resolve(path, entry.name)],
  );
}

function count(source, value) {
  return source.split(value).length - 1;
}

function allowedSourceTerm(root, path, source, term) {
  const local = relative(root, path).replaceAll('\\', '/');
  if (local.endsWith('.d.ts')) return true;
  if (
    local === 'packages/obsidian-plugin/src/network-deny-runtime.ts' &&
    ((term === 'fetch(' && count(source, 'fetch(') === 1) ||
      (term === 'XMLHttpRequest' && count(source, 'XMLHttpRequest') === 1)) &&
    source.includes('PB-NETWORK-001')
  )
    return true;
  return false;
}

function unexpectedBundleUrls(source) {
  const urls = source.match(/https:\/\/[^"'`\s)\\]+/gu) ?? [];
  return [...new Set(urls)].filter(
    (url) => !inertMetadataPrefixes.some((prefix) => url.startsWith(prefix)),
  );
}

export function scanProductionPaths(root) {
  const sourceRoot = resolve(root, 'packages');
  const distRoot = resolve(root, 'packages/obsidian-plugin/dist');
  const paths = [
    ...new Set(
      [sourceRoot, distRoot]
        .flatMap(walk)
        .filter((path) => extensions.has(path.slice(path.lastIndexOf('.')))),
    ),
  ];
  return paths.flatMap((path) => {
    const source = readFileSync(path, 'utf8');
    const inBundle = path.startsWith(`${distRoot}/`);
    const findings = denied
      .filter((term) => source.includes(term))
      .filter((term) => !allowedSourceTerm(root, path, source, term))
      .map((term) => ({ path, term }));
    if (inBundle)
      findings.push(
        ...unexpectedBundleUrls(source).map((url) => ({
          path,
          term: `unexpected-url:${url}`,
        })),
      );
    return findings;
  });
}

const root = resolve(process.argv[2] ?? resolve(import.meta.dirname, '..'));
const findings = scanProductionPaths(root);
const policy =
  'Production document processing is offline with no model download, import, inference, or telemetry network exception.';
if (findings.length > 0) {
  console.error(JSON.stringify({ policy, findings }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ policy, scanned: 'packages + bundle' }));
}
