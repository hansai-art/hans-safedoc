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
  'ACC-DET-001': 'detection/detect-all.test.ts',
  'ACC-DET-002': 'detection/threshold-separation.test.ts',
  'ACC-DET-003': 'detection/rule-score-naming.test.ts',
  'ACC-DET-004': 'detection/unicode-offset.test.ts',
  'ACC-DET-005': 'detection/capture-indices.test.ts',
  'ACC-DET-006': 'detection/context-no-cross-line.test.ts',
  'ACC-DET-007': 'detection/structured-context.test.ts',
  'ACC-DET-008': 'detection/overlap-risk-union.test.ts',
  'ACC-DET-009': 'detection/ambiguous-identifier.test.ts',
  'ACC-DET-010': 'detection/block-handling-merge.test.ts',
  'ACC-DET-011': 'detection/tw-phone-types.test.ts',
  'ACC-DET-012': 'detection/no-mobile-as-landline.test.ts',
  'ACC-DET-013': 'detection/passport-tiering.test.ts',
  'ACC-DET-014': 'detection/passport-no-context-drop.test.ts',
  'ACC-DET-015': 'detection/tw-address.test.ts',
  'ACC-DET-016': 'detection/tw-postcode.test.ts',
  'ACC-DET-017': 'detection/secret-block.test.ts',
  'ACC-DET-018': 'detection/taiwan-regression.test.ts',
  'ACC-DET-019': 'detection/common-identifiers.test.ts',
  'ACC-DET-020': 'fuzz/detector-fuzz.test.ts',
  'ACC-REV-001': 'review/entity-level.test.ts',
  'ACC-REV-002': 'review/split-invalidates.test.ts',
  'ACC-REV-003': 'review/merge-severity.test.ts',
  'ACC-REV-004': 'ui/low-score-visibility.test.ts',
  'ACC-REV-005': 'review/batch-action.test.ts',
  'ACC-REV-006': 'dictionary/longest-exact.test.ts',
  'ACC-REV-007': 'dictionary/case-alias.test.ts',
  'ACC-REV-008': 'dictionary/priority-risk.test.ts',
  'ACC-REV-009': 'dictionary/scope-override.test.ts',
  'ACC-REV-010': 'review/ambiguous-gate.test.ts',
  'ACC-REV-011': 'dictionary/import-limits.test.ts',
  'ACC-REV-012': 'review/version-stale.test.ts',
  'ACC-TOK-001': 'token/format-uniqueness.test.ts',
  'ACC-TOK-002': 'token/same-job-consistency.test.ts',
  'ACC-TOK-003': 'token/cross-job-unlinkability.test.ts',
  'ACC-TOK-004': 'token/surface-preferred-display.test.ts',
  'ACC-TOK-005': 'token/reverse-replacement.test.ts',
  'ACC-TOK-006': 'token/span-hash-guard.test.ts',
  'ACC-TOK-007': 'token/forgery.test.ts',
  'ACC-TOK-008': 'token/cross-job-reject.test.ts',
  'ACC-TOK-009': 'crypto/hkdf-domain.test.ts',
  'ACC-TOK-010': 'crypto/iv-uniqueness.test.ts',
  'ACC-TOK-011': 'crypto/envelope-tamper.test.ts',
  'ACC-TOK-012': 'crypto/passphrase-policy.test.ts',
  'ACC-TOK-013': 'mapping/persistence-roundtrip.test.ts',
  'ACC-TOK-014': 'handling/no-reversible-secret.test.ts',
  'ACC-TOK-015': 'mapping/no-silent-recreate.test.ts',
  'ACC-EXP-001': 'golden/markdown-preservation.test.ts',
  'ACC-EXP-002': 'golden/frontmatter-code.test.ts',
  'ACC-EXP-003': 'recovery/shadow-atomic.test.ts',
  'ACC-EXP-004': 'golden/wikilink-pathmap.test.ts',
  'ACC-EXP-005': 'security/shadow-content-allowlist.test.ts',
  'ACC-EXP-006': 'export/residual-all.test.ts',
  'ACC-EXP-007': 'export/residual-review-gate.test.ts',
  'ACC-EXP-008': 'export/guard-matrix.test.ts',
  'ACC-EXP-009': 'security/safe-zip.test.ts',
  'ACC-EXP-010': 'security/package-content.test.ts',
  'ACC-EXP-011': 'export/package-self-validate.test.ts',
  'ACC-EXP-012': 'export/package-size-limit.test.ts',
  'ACC-IMP-001': 'import/valid-result.test.ts',
  'ACC-IMP-002': 'import/malformed-token-strict.test.ts',
  'ACC-IMP-003': 'import/unknown-forged-token.test.ts',
  'ACC-IMP-004': 'import/cross-job-package.test.ts',
  'ACC-IMP-005': 'import/references-paths.test.ts',
  'ACC-IMP-006': 'security/result-rendering.test.ts',
  'ACC-IMP-007': 'restore/end-to-end.test.ts',
  'ACC-IMP-008': 'fuzz/result-dos.test.ts',
  'ACC-OPS-001': 'audit/no-raw-values.test.ts',
  'ACC-OPS-002': 'audit/hash-chain.test.ts',
  'ACC-OPS-003': 'recovery/journal-phase-matrix.test.ts',
  'ACC-OPS-004': 'migration/copy-on-write.test.ts',
  'ACC-OPS-005': 'backup/job-backup.test.ts',
  'ACC-OPS-006': 'release/reproducible-artifacts.test.mjs',
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
console.log(`REAL ACCEPTANCE PASS ${Object.keys(acceptanceTests).length}/105`);
