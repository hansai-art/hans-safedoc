import { describe, expect, it } from 'vitest';
import {
  clearSensitiveUiState,
  commandPresentation,
  disabledReasons,
} from '../../packages/obsidian-plugin/src/ui-state.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('E14 Obsidian accessible UI state', () =>
  it('provides keyboard/screen-reader labels and clears sensitive selection when locked', () => {
    expect(commandPresentation('LOCKED', 'export')).toMatchObject({
      enabled: false,
      ariaLabel: 'Hans SafeDoc：輸出',
    });
    expect(commandPresentation('LOCKED', 'recovery').enabled).toBe(true);
    expect(clearSensitiveUiState()).toEqual({ selectedEntityId: undefined, preview: undefined });
  }));

describe('E14 Obsidian workflow integration', () => {
  it('renders every export disabled reason instead of a generic greyed-out control', () => {
    expect(
      disabledReasons({
        pendingCandidates: 12,
        secrets: 2,
        unsupportedFiles: 4,
        sourceChanged: true,
        mappingUnlocked: false,
        residualScanComplete: false,
      }),
    ).toEqual([
      '仍有 12 個項目尚未確認',
      '有 2 個機密字串',
      '有 4 個不支援附件未排除',
      '原始文件已變更',
      '安全代碼對照資料尚未解鎖',
      '殘留敏感資料檢查尚未完成',
    ]);
  });

  it('registers one ribbon icon, the five locked commands, and a right workspace view', () => {
    const main = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/main.ts'),
      'utf8',
    );
    expect(main.match(/addRibbonIcon\(/g)).toHaveLength(1);
    expect(main).toContain(
      "addRibbonIcon('shield-check', '處理目前文件', () => this.scanCurrentNote())",
    );
    expect(main).toContain('openSanitizedPreview');
    expect(main).toContain('openDiffPreview');
    expect(main).toContain('openTutorial');
    expect(main).toContain("getLeaf('tab')");
    for (const command of [
      'open-dashboard',
      'scan-current-note',
      'create-new-job',
      'lock-current-client',
      'resume-interrupted-job',
    ])
      expect(main).toContain(`id: '${command}'`);
    expect(main).toContain('getRightLeaf(false)');
    expect(main).toContain('setViewState({ type: PRIVACY_BRIDGE_VIEW');
    expect(main).toContain('scanCurrentNote()');
    expect(main).toContain('exportCurrentNote()');
    expect(main).toContain('prepareReviewedDocument');
    expect(main).toContain('publishPreparedDocument');
    expect(main).toContain('reviewCandidate(candidateId, decision)');
    expect(main).toContain('previewCurrentNote()');
    expect(main).toContain('this.reviewSession = undefined');
    const scanMethod = main.slice(main.indexOf('private async scanCurrentNote'));
    expect(scanMethod.indexOf('activeMarkdown()')).toBeLessThan(
      scanMethod.indexOf('activateWorkspace()'),
    );
    expect(main).toMatch(/setClientState\(\s*'LOCKED'/);
    const workspace = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/workspace.ts'),
      'utf8',
    );
    expect(workspace).toContain('接受並安全代碼化');
    expect(workspace).toContain('忽略並保留原文');
    expect(workspace).toContain('建立轉換預覽');
    expect(workspace).toContain('只看變更');
    expect(workspace).toContain('開啟完整比較');
    expect(workspace).toContain('上一處');
    expect(workspace).toContain('下一處');
    expect(workspace).toContain("'未變更內容'");
    expect(workspace).toContain("'aria-pressed'");
    expect(workspace).toContain('返回修改審核');
    expect(workspace).toContain('全部安全代碼化');
    expect(workspace).toContain('強制人工確認不會被批次接受');
    expect(workspace).toContain('確認全部安全代碼化');
    expect(workspace).toContain('顯示輸出位置');
    expect(workspace).toContain('queueMicrotask(() => cancel.focus())');
    expect(workspace).toContain('新手教學');
    expect(workspace).toContain('查看完整代碼');
    expect(workspace).toContain('顯示前後 3 行');
    expect(workspace).toContain('展開這一段');
    expect(workspace).toContain('privacy-bridge-type-filter');
    expect(workspace).not.toContain('privacy-bridge-copy-status');
    expect(workspace).toContain('privacy-bridge-primary-actions');
    const renderBody = workspace.slice(workspace.indexOf('private render(): void'));
    expect(renderBody.indexOf('this.renderPrimaryActions')).toBeGreaterThan(-1);
    expect(renderBody.indexOf('this.renderPrimaryActions')).toBeLessThan(
      renderBody.indexOf("cls: 'privacy-bridge-candidates'"),
    );
    const styles = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/styles.css'),
      'utf8',
    );
    expect(styles).toMatch(
      /\.privacy-bridge-primary-actions\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*0;/u,
    );
    expect(workspace).toContain('完成：安全檔案已建立');
    expect(workspace).toContain('開啟安全預覽');
    expect(workspace).toContain('顯示輸出位置');
    expect(workspace).not.toContain('navigator.clipboard');
    expect(workspace).not.toContain('複製檔案位置');
    expect(workspace).toContain('只上傳這份安全代碼化檔案');
    expect(workspace).not.toContain('只上傳這份安全代碼化的 MD 文件');
    expect(workspace).toContain("cls: 'mod-cta'");
    expect(workspace).toContain('查看安全檔案位置與上傳說明');
    expect(workspace).toContain('查看轉換細節');
    expect(workspace).toContain('privacy-bridge-completed-details');
    const outputMethod = workspace.slice(
      workspace.indexOf('private renderOutputResult'),
      workspace.indexOf('private renderCompletedDetails'),
    );
    expect(outputMethod.indexOf('privacy-bridge-output-actions')).toBeLessThan(
      outputMethod.indexOf('privacy-bridge-output-details'),
    );
    const renderMethod = workspace.slice(workspace.indexOf('private render(): void'));
    expect(renderMethod.indexOf('if (this.outputFile)')).toBeLessThan(
      renderMethod.indexOf('if (!this.preview)'),
    );
    expect(workspace).toContain('IntersectionObserver');
    expect(workspace).toContain('aria-keyshortcuts');
    expect(workspace).not.toContain('innerHTML');
    expect(workspace).not.toContain('匿名');
    const preview = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/preview-view.ts'),
      'utf8',
    );
    expect(preview).toContain('安全代碼化預覽');
    expect(preview).not.toContain('innerHTML');
    expect(preview).not.toContain('MarkdownRenderer');
    expect(preview).not.toContain('SOURCE');
    expect(preview).not.toContain('basename');
    const diffModal = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/diff-modal.ts'),
      'utf8',
    );
    expect(diffModal).toContain('extends Modal');
    expect(diffModal).toContain('privacy-bridge-modal-original');
    expect(diffModal).toContain('privacy-bridge-modal-sanitized');
    expect(diffModal).toContain('上一處');
    expect(diffModal).toContain('下一處');
    expect(diffModal).not.toContain('innerHTML');
    expect(diffModal).not.toContain('basename');
    const help = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/help-view.ts'),
      'utf8',
    );
    expect(help).toContain('如何轉換、輸出並交給其他工具');
    expect(help).toContain('如何安全還原');
    expect(help).toContain('目前測試版尚未開放安全還原');
    expect(help).toContain('給其他工具的提示詞');
    expect(help).toContain('請手動選取上方提示詞');
    expect(help).not.toContain('innerHTML');
    expect(help).not.toContain('匿名');
  });
});
