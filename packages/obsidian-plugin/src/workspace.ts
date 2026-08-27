import { ItemView, type WorkspaceLeaf } from 'obsidian';
import {
  clearSensitiveUiState,
  disabledReasons,
  type ClientUiState,
  type WorkflowBlockers,
} from './ui-state.js';

export const PRIVACY_BRIDGE_VIEW = 'privacy-bridge-workspace';

/** The view owns only display state. Keys and raw values stay in the secure workflow layer. */
export class PrivacyBridgeWorkspaceView extends ItemView {
  private clientState: ClientUiState = 'LOCKED';
  private blockers: WorkflowBlockers = {};
  private sensitive = clearSensitiveUiState();

  constructor(leaf: WorkspaceLeaf) {
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
    if (state === 'LOCKED') this.sensitive = clearSensitiveUiState();
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
    const button = section.createEl('button', {
      text: '匯出 Safe Package',
      attr: { 'aria-label': 'Privacy Bridge: export' },
    });
    button.disabled = this.clientState === 'LOCKED' || reasons.length > 0;
    if (button.disabled) {
      const allReasons =
        this.clientState === 'LOCKED' ? ['請先解鎖 Client 才能執行此操作。', ...reasons] : reasons;
      section.createEl('ul', { attr: { 'aria-label': '匯出不可用原因' } }, (list) =>
        allReasons.forEach((reason) => list.createEl('li', { text: reason })),
      );
    }
  }
}
