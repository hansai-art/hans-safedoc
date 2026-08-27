import { readFile } from 'node:fs/promises';
import { test, expect } from 'vitest';
import { parseSemVer } from '@privacy-bridge/core';

test('ACC-FND-001: locked bootstrap declares runnable toolchain and core parses its version', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  expect(pkg.packageManager).toMatch(/^pnpm@/u);
  expect(['lint', 'typecheck', 'test', 'build']).toSatisfy((names) =>
    names.every((name) => pkg.scripts[name]),
  );
  expect(parseSemVer(pkg.version)).toMatchObject({ ok: true });
});
