import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AGENT_LOCAL_PROMPT,
  EXTERNAL_AI_PROMPT,
  FILE_FORMAT_SUPPORT,
  SUPPORTED_EXTERNAL_EXTENSIONS,
} from '../../packages/obsidian-plugin/src/novice-support.js';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Hans SafeDoc v1.2 Obsidian integration contract', () => {
  it('centralizes the exact supported, blocked, and agent-only format policy', () => {
    expect(SUPPORTED_EXTERNAL_EXTENSIONS).toEqual(['md', 'txt', 'csv', 'docx', 'xlsx']);
    expect(FILE_FORMAT_SUPPORT).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extension: 'md', mode: 'SUPPORTED_READ_ONLY' }),
        expect.objectContaining({ extension: 'txt', mode: 'SUPPORTED_READ_ONLY' }),
        expect.objectContaining({ extension: 'csv', mode: 'SUPPORTED_READ_ONLY' }),
        expect.objectContaining({ extension: 'docx', mode: 'SUPPORTED_READ_ONLY' }),
        expect.objectContaining({ extension: 'xlsx', mode: 'SUPPORTED_READ_ONLY' }),
        expect.objectContaining({ extension: 'pdf', mode: 'LOCAL_AGENT_TO_MD_ONLY' }),
        expect.objectContaining({ extension: 'doc', mode: 'BLOCKED' }),
        expect.objectContaining({ extension: 'xls', mode: 'BLOCKED' }),
      ]),
    );
  });

  it('ships complete Traditional Chinese prompts with locked safety boundaries', () => {
    expect(AGENT_LOCAL_PROMPT).toContain('原始文件不得上傳到任何雲端服務');
    expect(AGENT_LOCAL_PROMPT).toContain('出現任何待審核項目時必須停下來');
    expect(AGENT_LOCAL_PROMPT).toContain('重新開檔與殘留檢查都通過');
    expect(AGENT_LOCAL_PROMPT).toContain('DOCX 或 XLSX');
    expect(AGENT_LOCAL_PROMPT).toContain('公式、註解、修訂、外部資料、巨集或未知結構');
    expect(EXTERNAL_AI_PROMPT).toContain('完整保留每一個形如 ⟦PB:…⟧ 的安全代碼');
    expect(EXTERNAL_AI_PROMPT).toContain('不得嘗試還原個資');
    expect(EXTERNAL_AI_PROMPT).toContain('安全代碼完整性無法確認');
    const main = read('packages/obsidian-plugin/src/main.ts');
    expect(main).toContain('預覽結果');
    expect(main).toContain('一般 Excel 或 Google 試算表');
    expect(main).not.toContain('確認 CSV 分隔符');
    expect(main).not.toContain('CSV 方言');
  });

  it('uses one external file picker and Electron webUtils without File.path', () => {
    const main = read('packages/obsidian-plugin/src/main.ts');
    const workspace = read('packages/obsidian-plugin/src/workspace.ts');
    expect(workspace).toContain('選擇檔案');
    expect(main).toContain("type = 'file'");
    expect(main).toContain('webUtils.getPathForFile');
    expect(main).not.toContain('selected.path');
    expect(main).not.toContain('input.files?.[0].path');
    expect(main).toContain('無法取得本機檔案路徑');
    expect(workspace).toContain('處理另一份檔案');
    expect(workspace).toContain('this.actions.chooseFile()');
  });

  it('clears the previous review session before opening another external file', () => {
    const main = read('packages/obsidian-plugin/src/main.ts');
    const workspace = read('packages/obsidian-plugin/src/workspace.ts');
    expect(workspace).toContain('resetSelection');
    expect(main).toContain('this.reviewSession = undefined');
    expect(main).toContain('view?.resetSelection()');
    expect(main.indexOf('view?.resetSelection()')).toBeLessThan(
      main.indexOf('openExternalReviewDocument('),
    );
  });

  it('renders blocked files as a recovery card instead of a technical status line', () => {
    const workspace = read('packages/obsidian-plugin/src/workspace.ts');
    expect(workspace).toContain('這份檔案目前不能安全處理');
    expect(workspace).toContain('原始檔沒有被修改，也沒有建立輸出。');
    expect(workspace).toContain("text: '處理另一份檔案'");
    expect(workspace).toContain('this.actions.chooseFile()');
  });

  it('keeps identifiers compatible while aligning 1.2.4 metadata', () => {
    const packageJson = JSON.parse(read('package.json')) as { version: string };
    const pluginPackage = JSON.parse(read('packages/obsidian-plugin/package.json')) as {
      version: string;
    };
    const pluginManifest = JSON.parse(read('packages/obsidian-plugin/manifest.json')) as {
      id: string;
      name: string;
      version: string;
      minAppVersion: string;
      description: string;
    };
    const rootManifest = JSON.parse(read('manifest.json')) as typeof pluginManifest;
    const versions = JSON.parse(read('versions.json')) as Record<string, string>;
    expect(packageJson.version).toBe('1.2.4');
    expect(pluginPackage.version).toBe('1.2.4');
    expect(pluginManifest).toMatchObject({
      id: 'privacy-bridge',
      name: 'Hans SafeDoc',
      version: '1.2.4',
    });
    expect(rootManifest).toEqual(pluginManifest);
    expect(pluginManifest.description).toContain('MD, TXT, CSV, DOCX, and XLSX');
    expect(versions['1.2.4']).toBe(pluginManifest.minAppVersion);
    expect(read('packages/obsidian-plugin/src/main.ts')).toContain("id: 'scan-current-note'");
    for (const path of [
      'packages/obsidian-plugin/src/help-view.ts',
      'packages/obsidian-plugin/src/first-run-modal.ts',
      'packages/obsidian-plugin/src/diff-modal.ts',
      'packages/obsidian-plugin/src/workspace.ts',
      'packages/obsidian-plugin/src/ui-state.ts',
      'packages/obsidian-plugin/src/main.ts',
    ]) {
      const visibleCopy = read(path);
      expect(visibleCopy).not.toContain("text: 'Privacy Bridge");
      expect(visibleCopy).not.toContain("return 'Privacy Bridge");
      expect(visibleCopy).not.toContain("name: 'Privacy Bridge");
      expect(visibleCopy).not.toContain('Privacy Bridge Outputs');
    }
    const help = read('packages/obsidian-plugin/src/help-view.ts');
    expect(help).toContain('MD、TXT、CSV、DOCX 或 XLSX');
    expect(help).toContain('Hans SafeDoc Outputs');
    expect(read('packages/obsidian-plugin/src/workspace.ts')).not.toContain(
      'Privacy Bridge 新手教學',
    );
  });

  it('uses one Hans SafeDoc output directory for Markdown and external formats', () => {
    const main = read('packages/obsidian-plugin/src/main.ts');
    expect(main).toContain("resolve(dirname(vaultRoot), 'Hans SafeDoc Outputs')");
    expect(main).not.toContain("resolve(dirname(vaultRoot), 'Privacy Bridge Outputs')");
  });

  it('fails release artifact creation on a dirty tree before touching output and keeps individual assets', () => {
    const script = read('scripts/release-artifact.mjs');
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const workflow = read('.github/workflows/ci.yml');
    const dirtyGuard = script.indexOf("git', ['status', '--porcelain");
    const removeOutput = script.indexOf('await rm(outdir');
    expect(dirtyGuard).toBeGreaterThan(-1);
    expect(dirtyGuard).toBeLessThan(removeOutput);
    for (const asset of ['main.js', 'manifest.json', 'styles.css']) {
      expect(script).toContain(`'${asset}'`);
    }
    expect(packageJson.scripts.ci).toContain('pnpm acceptance');
    expect(packageJson.scripts['format:check']).not.toMatch(/'[^']*\*[^']*'/u);
    expect(workflow).toContain('- run: pnpm acceptance');
    expect(workflow).toMatch(/supply-chain-and-release:[\s\S]*pnpm build[\s\S]*pnpm sbom/u);
    expect(script).toContain("execFileSync('pnpm', ['acceptance']");
    expect(script.indexOf("execFileSync('pnpm', ['acceptance']")).toBeLessThan(removeOutput);
    expect(script).toContain("resolve(root, 'manifest.json')");
    expect(script).toContain("resolve(root, 'versions.json')");
    expect(script).toContain("resolve(root, 'package.json')");
    expect(script).toContain('packages/obsidian-plugin/manifest.json');
    expect(script).toContain('packages/obsidian-plugin/package.json');
    expect(script).toContain('Release version metadata mismatch');
    expect(script).toContain("sbom: 'sbom.cdx.json'");
    expect(script).toContain('Release archive entry validation failed');
    expect(script).toContain('ZIP_REGULAR_FILE_MODE = (0o100644 << 16) >>> 0');
    expect(script).toContain('`${archiveName}.sha256`');
    expect(script).toContain("'THIRD-PARTY-NOTICES.md'");
    expect(script).toContain('docs/THREAT-MODEL-V1.1.md');
    expect(script).toContain('hans-safedoc-${version}.zip');
    expect(script).not.toContain('privacy-bridge-alpha.zip');
    expect(read('scripts/clean-machine-check.mjs')).toContain("['pnpm', ['run', 'sbom']]");
  });

  it('publishes an explicit version tag as a public release with direct Community assets', () => {
    const workflow = read('.github/workflows/release.yml');
    expect(workflow).toContain("tags: ['*.*.*']");
    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('attestations: write');
    expect(workflow).toContain('pnpm install --frozen-lockfile');
    expect(workflow).toContain('pnpm run ci');
    expect(workflow).toContain('actions/attest-build-provenance@v4');
    expect(workflow).toContain('artifacts/release/main.js');
    expect(workflow).toContain('artifacts/release/manifest.json');
    expect(workflow).toContain('artifacts/release/styles.css');
    expect(workflow).toContain('gh release create "$GITHUB_REF_NAME"');
    const formatCheck = JSON.parse(read('package.json')).scripts['format:check'];
    expect(formatCheck).toContain('.github/workflows/ci.yml');
    expect(formatCheck).toContain('.github/workflows/release.yml');
  });

  it('records host network evidence without persisting signed query strings or runtime hooks', () => {
    const recorder = read('scripts/record-obsidian-network-evidence.mjs');
    expect(recorder).toContain("url.search = ''");
    expect(recorder).toContain("url.hash = ''");
    expect(recorder).toContain('globalThis.__HSD_NET_RESTORE__');
    expect(recorder).toContain("await send('Runtime.evaluate'");
    expect(recorder).toContain('mode: 0o600');
    expect(recorder).not.toContain('postData');
    expect(recorder).not.toContain('request.headers');
  });
});
