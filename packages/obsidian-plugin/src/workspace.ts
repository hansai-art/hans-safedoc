import { ItemView, type WorkspaceLeaf } from 'obsidian';
import {
  clearSensitiveUiState,
  disabledReasons,
  type ClientUiState,
  type WorkflowBlockers,
} from './ui-state.js';
import type { DetectedCandidate } from '@privacy-bridge/core';

export const PRIVACY_BRIDGE_VIEW = 'privacy-bridge-workspace';

export interface PrivacyBridgeWorkspaceActions {
  scanCurrentNote(): Promise<void>;
  exportCurrentNote(): Promise<void>;
}

/** The view owns only display state. Keys and raw values stay in the secure workflow layer. */
export class PrivacyBridgeWorkspaceView extends ItemView {
  private clientState: ClientUiState = 'LOCKED';
  private blockers: WorkflowBlockers = {};
  private sensitive = clearSensitiveUiState();
  private sourcePath: string | undefined;
  private candidates: readonly DetectedCandidate[] = [];
  private outputFile: string | undefined;
  private statusMessage: string | undefined;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly actions: PrivacyBridgeWorkspaceActions,
  ) {
    super(leaf);
  }
  override getViewType(): string {
    return PRIVACY_BRIDGE_VIEW;
  }
  override getDisplayText(): string {
    return 'Privacy Bridge';
  }
  override getIcon(): string {
    return 'shield-check';
  }
  setClientState(state: ClientUiState): void {
    this.clientState = state;
    if (state === 'LOCKED') {
      this.sensitive = clearSensitiveUiState();
      this.sourcePath = undefined;
      this.candidates = [];
      this.outputFile = undefined;
    }
    this.render();
  }
  setScanResult(sourcePath: string, candidates: readonly DetectedCandidate[]): void {
    this.clientState = 'UNLOCKED';
    this.sourcePath = sourcePath;
    this.candidates = candidates;
    this.outputFile = undefined;
    this.statusMessage = `找到 ${candidates.length} 個候選項目。`;
    this.render();
  }
  setOutputResult(outputFile: string): void {
    this.outputFile = outputFile;
    this.statusMessage = '去識別化輸出已完成，來源文件未修改。';
    this.render();
  }
  setError(message: string): void {
    this.statusMessage = message;
    this.render();
  }
  setExportBlockers(blockers: WorkflowBlockers): void {
    this.blockers = blockers;
    this.render();
  }
  override async onOpen(): Promise<void> {
    this.render();
  }
  override async onClose(): Promise<void> {
    this.sensitive = clearSensitiveUiState();
  }
  private render(): void {
    const reasons = disabledReasons(this.blockers);
    this.containerEl.empty();
    const section = this.containerEl.createDiv({ cls: 'privacy-bridge-workspace' });
    section.createEl('h2', { text: 'Privacy Bridge' });
    section.createEl('p', {
      text: this.clientState === 'LOCKED' ? 'Client 已鎖定，敏感內容已遮罩。' : 'Client 已解鎖。',
    });
    section.createEl('p', {
      text: 'Alpha 合成資料模式：只讀取目前 Markdown，輸出到 Vault 外的 Privacy Bridge Outputs。',
    });
    const scanButton = section.createEl('button', {
      text: '掃描目前文件',
      attr: { 'aria-label': 'Privacy Bridge: scan current note' },
    });
    scanButton.addEventListener('click', () => void this.actions.scanCurrentNote());
    if (this.statusMessage) section.createEl('p', { text: this.statusMessage });
    if (this.sourcePath) section.createEl('p', { text: `來源：${this.sourcePath}` });
    if (this.candidates.length > 0) {
      section.createEl('h3', { text: '偵測結果' });
      section.createEl('ul', { attr: { 'aria-label': '去識別化候選項目' } }, (list) =>
        this.candidates.forEach((candidate) =>
          list.createEl('li', {
            text: `${candidate.primaryType}：${candidate.surfaceText}`,
          }),
        ),
      );
    }
    const button = section.createEl('button', {
      text: '建立去識別化輸出',
      attr: { 'aria-label': 'Privacy Bridge: create sanitized output' },
    });
    button.disabled =
      this.clientState === 'LOCKED' || this.candidates.length === 0 || reasons.length > 0;
    button.addEventListener('click', () => void this.actions.exportCurrentNote());
    if (button.disabled) {
      const allReasons =
        this.clientState === 'LOCKED'
          ? ['請先掃描目前文件。', ...reasons]
          : this.candidates.length === 0
            ? ['目前文件沒有可輸出的候選項目。', ...reasons]
            : reasons;
      section.createEl('ul', { attr: { 'aria-label': '匯出不可用原因' } }, (list) =>
        allReasons.forEach((reason) => list.createEl('li', { text: reason })),
      );
    }
    if (this.outputFile) section.createEl('p', { text: `輸出檔：${this.outputFile}` });
  }
}
