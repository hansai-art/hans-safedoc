import { Plugin, Platform, type WorkspaceLeaf } from 'obsidian';
import { assertDesktopRuntime } from './index.js';
import { PrivacyBridgeWorkspaceView, PRIVACY_BRIDGE_VIEW } from './workspace.js';

export default class ObsidianPrivacyBridgePlugin extends Plugin {
  override async onload(): Promise<void> {
    assertDesktopRuntime({ isMobile: Platform.isMobile });
    this.registerView(PRIVACY_BRIDGE_VIEW, (leaf) => new PrivacyBridgeWorkspaceView(leaf));
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
      callback: () => this.activateWorkspace(),
    });
    this.addCommand({
      id: 'create-new-job',
      name: 'Privacy Bridge: Create new job',
      callback: () => this.activateWorkspace(),
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
  private async activateWorkspace(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_VIEW)[0];
    const leaf = existing ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await this.app.workspace.revealLeaf(leaf);
  }
  private async lockWorkspace(): Promise<void> {
    for (const leaf of this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_VIEW))
      (leaf as WorkspaceLeaf & { view?: PrivacyBridgeWorkspaceView }).view?.setClientState(
        'LOCKED',
      );
  }
}
