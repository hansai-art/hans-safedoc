import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const matrixPath = 'docs/ACCEPTANCE-MATRIX.csv';
const rows = readFileSync(matrixPath, 'utf8')
  .replace(/^\uFEFF/u, '')
  .trim()
  .split(/\r?\n/u)
  .slice(1)
  .map((line) => {
    const match = /^(ACC-[A-Z]+-\d{3}),([^,]+)/u.exec(line);
    if (!match) throw new Error(`Cannot parse acceptance row: ${line}`);
    return { id: match[1], category: match[2] };
  });

const byCategory = {
  Foundation: ['tests/foundation/e00-foundation.test.ts', 'tests/core/e01-contracts.test.ts'],
  'Secure Store': [
    'tests/core/e02-crypto.test.ts',
    'tests/core/e13-recovery.test.ts',
    'tests/core/e16-lifecycle-review.test.ts',
  ],
  'File Inventory': ['tests/core/e03-inventory.test.ts', 'tests/core/e16-lifecycle-review.test.ts'],
  Detection: ['tests/core/e04-detection.test.ts'],
  Review: ['tests/core/e16-lifecycle-review.test.ts', 'tests/core/e14-ui-state.test.ts'],
  Dictionary: ['tests/core/e05-resolution.test.ts', 'tests/core/e16-lifecycle-review.test.ts'],
  Token: [
    'tests/core/e02-crypto.test.ts',
    'tests/core/e07-tokenization.test.ts',
    'tests/core/e13-recovery.test.ts',
  ],
  Crypto: ['tests/core/e02-crypto.test.ts'],
  Mapping: ['tests/core/e07-tokenization.test.ts', 'tests/core/e13-recovery.test.ts'],
  Handling: ['tests/core/e04-detection.test.ts', 'tests/core/e07-tokenization.test.ts'],
  Shadow: ['tests/core/e08-markdown-pathmap.test.ts', 'tests/core/e09-shadow-vault.test.ts'],
  Residual: ['tests/core/e10-export-guard.test.ts'],
  'Export Guard': ['tests/core/e10-export-guard.test.ts'],
  'Safe Package': ['tests/core/e11-safe-package.test.ts'],
  Import: ['tests/core/e12-result-restore.test.ts'],
  Restore: ['tests/core/e12-result-restore.test.ts'],
  Audit: ['tests/core/e06-audit.test.ts'],
  Recovery: ['tests/core/e13-recovery.test.ts'],
  Migration: ['tests/core/e13-recovery.test.ts'],
  'Backup/Delete': ['tests/core/e13-recovery.test.ts'],
  Release: ['tests/foundation/e00-foundation.test.ts', 'tests/foundation/sbom.test.ts'],
};

const evidence = rows.map((row) => {
  const tests = byCategory[row.category];
  if (!tests?.length) throw new Error(`No evidence mapping for ${row.id} (${row.category})`);
  if (!tests.every(existsSync))
    throw new Error(`Missing evidence test for ${row.id}: ${tests.join(', ')}`);
  return { ...row, tests };
});
const files = [...new Set(evidence.flatMap((row) => row.tests))];
const result = spawnSync('pnpm', ['exec', 'vitest', 'run', ...files], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.status !== 0) process.exit(result.status ?? 1);
for (const row of evidence) console.log(`${row.id} EVIDENCE ${row.tests.join(' + ')}`);
console.log(`AUTOMATED EVIDENCE PASS ${evidence.length}/${rows.length} acceptance rows`);
console.log(
  'Locked acceptance/traceability status files were not modified. Gate D manual evidence remains PENDING.',
);
