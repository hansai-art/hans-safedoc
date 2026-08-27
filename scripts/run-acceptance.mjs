import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// This batch is intentionally explicit: an acceptance row has exactly one executable test file.
const acceptanceTests = Object.freeze({
  'ACC-FND-001': 'ci/bootstrap.test.mjs',
  'ACC-FND-002': 'schema/all-schemas.test.ts',
  'ACC-FND-003': 'integration/source-readonly.test.ts',
  'ACC-FND-004': 'architecture/core-boundary.test.ts',
  'ACC-FND-005': 'security/no-sensitive-logs.test.ts',
  'ACC-FND-006': 'integration/desktop-only.test.ts',
  'ACC-FND-007': 'security/network-deny.test.ts',
  'ACC-FND-008': 'regression/legacy-seed.test.ts',
  'ACC-STR-001': 'store/default-path.test.ts',
  'ACC-STR-002': 'store/unsafe-paths.test.ts',
  'ACC-STR-003': 'security/no-secure-data-in-vault.test.ts',
  'ACC-STR-004': 'store/dictionary-encryption.test.ts',
  'ACC-STR-005': 'crypto/key-isolation.test.ts',
  'ACC-STR-006': 'crypto/scrypt-vector.test.ts',
  'ACC-STR-007': 'crypto/aes-gcm-properties.test.ts',
  'ACC-STR-008': 'security/no-passphrase-persistence.test.ts',
  'ACC-STR-009': 'integration/auto-lock.test.ts',
  'ACC-STR-010': 'recovery/passphrase-change.test.ts',
  'ACC-STR-011': 'store/operator-identity.test.ts',
  'ACC-STR-012': 'recovery/job-lock.test.ts',
  'ACC-FIL-001': 'files/source-modes.test.ts',
  'ACC-FIL-002': 'files/system-exclusions.test.ts',
  'ACC-FIL-003': 'files/hidden-markdown.test.ts',
  'ACC-FIL-004': 'files/unsupported-blocker.test.ts',
  'ACC-FIL-005': 'files/symlink-junction.test.ts',
  'ACC-FIL-006': 'files/nested-vault.test.ts',
  'ACC-FIL-007': 'files/encoding-supported.test.ts',
  'ACC-FIL-008': 'files/encoding-reject.test.ts',
  'ACC-FIL-009': 'security/path-boundary.test.ts',
  'ACC-FIL-010': 'files/path-collision.test.ts',
  'ACC-FIL-011': 'integration/source-change.test.ts',
  'ACC-FIL-012': 'files/source-disappears.test.ts',
});

function productCalls(source) {
  const imports = [
    ...source.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*['"]@privacy-bridge\/(?:core|obsidian-plugin)['"]/gu,
    ),
  ]
    .flatMap((match) => match[1].split(','))
    .map(
      (part) =>
        part
          .trim()
          .replace(/^type\s+/u, '')
          .split(/\s+as\s+/u)[0],
    )
    .filter(Boolean);
  return imports.some((name) => new RegExp(`\\b${name}\\s*\\(`, 'u').test(source));
}

for (const [id, path] of Object.entries(acceptanceTests)) {
  if (!existsSync(path)) throw new Error(`${id} refuses missing matrix path: ${path}`);
  const source = readFileSync(path, 'utf8');
  if (!productCalls(source))
    throw new Error(
      `${id} refuses metadata-only test without a non-test product import and call: ${path}`,
    );
}

const result = spawnSync('pnpm', ['exec', 'vitest', 'run', ...Object.values(acceptanceTests)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`REAL ACCEPTANCE PASS ${Object.keys(acceptanceTests).length}/32`);
