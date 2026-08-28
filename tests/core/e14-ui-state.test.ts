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
    expect(main).toContain('runSyntheticDocumentWorkflow');
    expect(main).toContain('this.lastScannedFile = active.file');
    expect(main).toContain('this.activeMarkdown(this.lastScannedFile)');
    expect(main).toContain('this.lastScannedFile = undefined');
    const scanMethod = main.slice(main.indexOf('private async scanCurrentNote'));
    expect(scanMethod.indexOf('activeMarkdown()')).toBeLessThan(
      scanMethod.indexOf('activateWorkspace()'),
    );
    expect(main).toMatch(/setClientState\(\s*'LOCKED'/);
  });
});
