import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { Notice, Plugin, Platform, type TFile, type WorkspaceLeaf } from 'obsidian';
import { assertDesktopRuntime } from './index.js';
import { PrivacyBridgeWorkspaceView, PRIVACY_BRIDGE_VIEW } from './workspace.js';
import { runSyntheticDocumentWorkflow, scanSyntheticDocument } from './workflow.js';

export default class ObsidianPrivacyBridgePlugin extends Plugin {
  private lastScannedFile: TFile | undefined;
  override async onload(): Promise<void> {
    assertDesktopRuntime({ isMobile: Platform.isMobile });
    this.registerView(
      PRIVACY_BRIDGE_VIEW,
      (leaf) =>
        new PrivacyBridgeWorkspaceView(leaf, {
          scanCurrentNote: () => this.scanCurrentNote(),
          exportCurrentNote: () => this.exportCurrentNote(),
        }),
    );
    this.addRibbonIcon('shield-check', 'Open Privacy Bridge dashboard', () =>
      this.activateWorkspace(),
    );
    this.addCommand({
      id: 'open-dashboard',
      name: 'Privacy Bridge: Open dashboard',
      callback: () => this.activateWorkspace(),
    });
    this.addCommand({
      id: 'scan-current-note',
      name: 'Privacy Bridge: Scan current note',
      callback: () => this.scanCurrentNote(),
    });
    this.addCommand({
      id: 'create-new-job',
      name: 'Privacy Bridge: Create new job',
      callback: () => this.exportCurrentNote(),
    });
    this.addCommand({
      id: 'lock-current-client',
      name: 'Privacy Bridge: Lock current client',
      callback: () => this.lockWorkspace(),
    });
    this.addCommand({
      id: 'resume-interrupted-job',
      name: 'Privacy Bridge: Resume interrupted job',
      callback: () => this.activateWorkspace(),
    });
  }
  private async activateWorkspace(): Promise<PrivacyBridgeWorkspaceView | null> {
    const existing = this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_VIEW)[0];
    const leaf = existing ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) return null;
    if (!existing) await leaf.setViewState({ type: PRIVACY_BRIDGE_VIEW, active: true });
    await this.app.workspace.revealLeaf(leaf);
    return leaf.view instanceof PrivacyBridgeWorkspaceView ? leaf.view : null;
  }
  private async activeMarkdown(file = this.app.workspace.getActiveFile()): Promise<{
    file: TFile;
    content: string;
  } | null> {
    if (!file || file.extension.toLowerCase() !== 'md') return null;
    return { file, content: await this.app.vault.read(file) };
  }
  private async scanCurrentNote(): Promise<void> {
    const active = await this.activeMarkdown();
    const view = await this.activateWorkspace();
    if (!view || !active) {
      new Notice('請先打開要測試的 Markdown 文件。');
      view?.setError('請先打開要測試的 Markdown 文件。');
      return;
    }
    const scanned = scanSyntheticDocument(active.content);
    if (!scanned.ok) {
      view.setError(`掃描失敗：${scanned.error.code}`);
      return;
    }
    this.lastScannedFile = active.file;
    view.setScanResult(active.file.path, scanned.value);
  }
  private async exportCurrentNote(): Promise<void> {
    const active = await this.activeMarkdown(this.lastScannedFile);
    const view = await this.activateWorkspace();
    const vaultRoot = this.app.vault.adapter.getBasePath?.();
    if (!view || !active || !vaultRoot) {
      new Notice('請先打開要測試的 Markdown 文件。');
      view?.setError('無法取得目前 Markdown 或 Vault 路徑。');
      return;
    }
    const result = await runSyntheticDocumentWorkflow({
      vaultRoot,
      outputParent: resolve(dirname(vaultRoot), 'Privacy Bridge Outputs'),
      relativePath: active.file.path,
      content: active.content,
    });
    if (!result.ok) {
      const message =
        result.error.code === 'PB-DEMO-SECRET-BLOCK'
          ? '偵測到 Secret，依安全規則禁止輸出。'
          : `輸出失敗：${result.error.code}`;
      view.setError(message);
      new Notice(message);
      return;
    }
    const current = await this.app.vault.read(active.file);
    const currentHash = createHash('sha256').update(current, 'utf8').digest('hex');
    if (currentHash !== result.value.sourceSha256) {
      view.setError('來源文件在處理期間已變更，輸出結果不採用。');
      new Notice('來源文件在處理期間已變更。');
      return;
    }
    view.setScanResult(active.file.path, result.value.candidates);
    view.setOutputResult(result.value.outputFile);
    new Notice('Privacy Bridge 去識別化輸出已完成。');
  }
  private async lockWorkspace(): Promise<void> {
    this.lastScannedFile = undefined;
    for (const leaf of this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_VIEW))
      (leaf as WorkspaceLeaf & { view?: PrivacyBridgeWorkspaceView }).view?.setClientState(
        'LOCKED',
      );
  }
}
