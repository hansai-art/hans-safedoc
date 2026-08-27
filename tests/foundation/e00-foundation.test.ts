import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const file = (...parts: string[]) => join(root, ...parts);
const text = (...parts: string[]) => readFileSync(file(...parts), 'utf8');

/** ACC-FND-001: reproducible development skeleton has all required commands. */
describe('ACC-FND-001 repository bootstrap', () => {
  it('declares locked workspace tooling and the required verification commands', () => {
    const pkg = JSON.parse(text('package.json')) as {
      scripts?: Record<string, string>;
      packageManager?: string;
    };
    expect(pkg.packageManager).toMatch(/^pnpm@/);
    for (const command of [
      'lint',
      'format:check',
      'typecheck',
      'test',
      'build',
      'validate:schemas',
      'verify:lockfile',
      'sbom',
      'scan:secrets',
      'scan:licenses',
      'scan:network',
      'release:artifact',
    ])
      expect(pkg.scripts?.[command]).toBeTypeOf('string');
    expect(existsSync(file('pnpm-workspace.yaml'))).toBe(true);
  });
});

/** ACC-FND-003: E00 has no source writer; the source fixture remains byte-identical. */
describe('ACC-FND-003 source read-only scaffold', () => {
  it('does not alter the immutable golden source fixture while the empty plugin loads', async () => {
    const fixture = file('test-corpus', 'golden', 'markdown-preservation.input.md');
    const before = createHash('sha256').update(readFileSync(fixture)).digest('hex');
    const { PrivacyBridgePlugin } = await import('@privacy-bridge/obsidian-plugin');
    const plugin = new PrivacyBridgePlugin();
    await plugin.onload();
    await plugin.onunload();
    const after = createHash('sha256').update(readFileSync(fixture)).digest('hex');
    expect(after).toBe(before);
    expect(statSync(fixture).isFile()).toBe(true);
  });
});

/** ACC-FND-004: core remains importable without Obsidian or Electron. */
describe('ACC-FND-004 core boundary', () => {
  it('imports core and contains no forbidden platform dependencies', async () => {
    await expect(import('@privacy-bridge/core')).resolves.toBeDefined();
    const source = text('packages', 'core', 'src', 'index.ts');
    expect(source).not.toMatch(/from\s+['"](?:obsidian|electron)['"]/);
    expect(source).not.toMatch(/\bapp\b/);
  });
});

/** ACC-FND-005: empty production runtime does not write sensitive data to console. */
describe('ACC-FND-005 no sensitive logs scaffold', () => {
  it('does not emit a canary to console while loading the empty plugin', async () => {
    const canary = 'PB-CANARY-DO-NOT-LOG';
    const messages: string[] = [];
    const original = console.log;
    console.log = (...items: unknown[]) => messages.push(items.join(' '));
    try {
      const { PrivacyBridgePlugin } = await import('@privacy-bridge/obsidian-plugin');
      const plugin = new PrivacyBridgePlugin();
      await plugin.onload();
      await plugin.onunload();
    } finally {
      console.log = original;
    }
    expect(messages.join('\n')).not.toContain(canary);
  });
});

/** ACC-FND-006: desktop-only manifest and explicit mobile refusal. */
describe('ACC-FND-006 desktop-only plugin', () => {
  it('uses an isDesktopOnly manifest and returns PB-PLATFORM-001 on mobile', async () => {
    const manifest = JSON.parse(text('packages', 'obsidian-plugin', 'manifest.json')) as {
      isDesktopOnly?: boolean;
    };
    expect(manifest.isDesktopOnly).toBe(true);
    const { assertDesktopRuntime } = await import('@privacy-bridge/obsidian-plugin');
    expect(() => assertDesktopRuntime({ isMobile: true })).toThrow('PB-PLATFORM-001');
  });
});

/** ACC-FND-007: source and built plugin must contain no reachable network client API. */
describe('ACC-FND-007 network deny', () => {
  it('passes the repository network policy scanner', async () => {
    const { scanProductionPaths } = await import('../../scripts/network-scan.mjs');
    expect(scanProductionPaths(root)).toEqual([]);
  });
});

/** ACC-FND-008: legacy seed stays executable through its compatibility harness. */
describe('ACC-FND-008 legacy compatibility harness', () => {
  it('retains the locked seed and its non-superseded test harness', () => {
    expect(existsSync(file('reference', 'legacy-seed', 'taiwan-recognizers.v2.ts'))).toBe(true);
    expect(existsSync(file('reference', 'legacy-seed', 'taiwan-recognizers.v2.test.ts'))).toBe(
      true,
    );
    expect(text('reference', 'legacy-seed', 'taiwan-recognizers.v2.test.ts')).toContain(
      'tests failed',
    );
  });
});
