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
      ariaLabel: 'Privacy Bridge: export',
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
      '仍有 12 個未審核候選',
      '有 2 個 Secret',
      '有 4 個不支援附件未排除',
      '原始文件已變更',
      'Mapping 尚未解鎖',
      'Residual Scan 尚未完成',
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
    expect(workspace).toContain('接受並去識別化');
    expect(workspace).toContain('忽略並保留原文');
    expect(workspace).toContain('建立轉換預覽');
    expect(workspace).toContain('轉換前後對照');
    expect(workspace).toContain('查看完整原文');
    expect(workspace).toContain('查看完整轉換後');
    expect(workspace).toContain("'aria-pressed'");
    expect(workspace).toContain('審核完成：');
    expect(workspace).toContain('返回修改審核');
    expect(workspace).toContain('全部去識別化並預覽');
    expect(workspace).toContain('確認全部去識別化');
    expect(workspace).toContain('在 Finder 顯示輸出檔');
    expect(workspace).toContain('queueMicrotask(() => cancel.focus())');
    expect(workspace).not.toContain('innerHTML');
    const preview = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/preview-view.ts'),
      'utf8',
    );
    expect(preview).toContain('安全預覽');
    expect(preview).not.toContain('innerHTML');
    expect(preview).not.toContain('MarkdownRenderer');
  });
});
