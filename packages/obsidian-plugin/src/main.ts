import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { Notice, Plugin, Platform, type TFile, type WorkspaceLeaf } from 'obsidian';
import type { DetectedCandidate } from '@privacy-bridge/core';
import { assertDesktopRuntime } from './index.js';
import { PrivacyBridgePreviewView, PRIVACY_BRIDGE_PREVIEW_VIEW } from './preview-view.js';
import { PrivacyBridgeWorkspaceView, PRIVACY_BRIDGE_VIEW } from './workspace.js';
import {
  prepareReviewedDocument,
  publishPreparedDocument,
  scanSyntheticDocument,
  type CandidateDecision,
  type CandidateDecisions,
  type PreparedReviewedDocument,
} from './workflow.js';

interface ReviewSession {
  readonly file: TFile;
  readonly sourceContent: string;
  readonly candidates: readonly DetectedCandidate[];
  decisions: CandidateDecisions;
  prepared: PreparedReviewedDocument | undefined;
}

export default class ObsidianPrivacyBridgePlugin extends Plugin {
  private reviewSession: ReviewSession | undefined;
  override async onload(): Promise<void> {
    assertDesktopRuntime({ isMobile: Platform.isMobile });
    this.registerView(
      PRIVACY_BRIDGE_VIEW,
      (leaf) =>
        new PrivacyBridgeWorkspaceView(leaf, {
          scanCurrentNote: () => this.scanCurrentNote(),
          reviewCandidate: (candidateId, decision) => this.reviewCandidate(candidateId, decision),
          reviewAllCandidates: () => this.reviewAllCandidates(),
          previewCurrentNote: () => this.previewCurrentNote(),
          exportCurrentNote: () => this.exportCurrentNote(),
          revealOutputFile: (path) => this.revealOutputFile(path),
        }),
    );
    this.registerView(PRIVACY_BRIDGE_PREVIEW_VIEW, (leaf) => new PrivacyBridgePreviewView(leaf));
    this.addRibbonIcon('shield-check', '處理目前文件', () => this.scanCurrentNote());
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
    this.reviewSession = {
      file: active.file,
      sourceContent: active.content,
      candidates: scanned.value,
      decisions: {},
      prepared: undefined,
    };
    view.setScanResult(active.file.path, scanned.value);
  }
  private async reviewCandidate(candidateId: string, decision: CandidateDecision): Promise<void> {
    const session = this.reviewSession;
    const candidate = session?.candidates.find((item) => item.candidateId === candidateId);
    if (!session || !candidate || candidate.handling === 'BLOCK_EXPORT') return;
    session.decisions = { ...session.decisions, [candidateId]: decision };
    session.prepared = undefined;
    const view = await this.activateWorkspace();
    view?.setReviewDecision(candidateId, decision);
  }
  private async reviewAllCandidates(): Promise<void> {
    const session = this.reviewSession;
    const view = await this.activateWorkspace();
    if (!session || !view) return;
    const accepted = session.candidates
      .filter(
        (candidate) =>
          candidate.handling !== 'BLOCK_EXPORT' &&
          session.decisions[candidate.candidateId] === undefined,
      )
      .map((candidate) => candidate.candidateId);
    session.decisions = {
      ...session.decisions,
      ...Object.fromEntries(accepted.map((candidateId) => [candidateId, 'ACCEPTED' as const])),
    };
    session.prepared = undefined;
    view.setAllReviewDecisions(accepted);
    await this.previewCurrentNote();
  }
  private async previewCurrentNote(): Promise<void> {
    const session = this.reviewSession;
    const view = await this.activateWorkspace();
    if (!session || !view) return;
    const active = await this.activeMarkdown(session.file);
    const sourceHash = createHash('sha256')
      .update(active?.content ?? '', 'utf8')
      .digest('hex');
    const expectedHash = createHash('sha256').update(session.sourceContent, 'utf8').digest('hex');
    if (!active || sourceHash !== expectedHash) {
      view.setError('來源文件在審核期間已變更，請重新掃描。');
      return;
    }
    const prepared = prepareReviewedDocument(
      session.sourceContent,
      session.candidates,
      session.decisions,
    );
    if (!prepared.ok) {
      view.setError(
        prepared.error.code === 'PB-REVIEW-001'
          ? '仍有候選尚未審核。'
          : `無法建立預覽：${prepared.error.code}`,
      );
      return;
    }
    session.prepared = prepared.value;
    view.setPreview(
      prepared.value.sourceContent,
      prepared.value.sanitizedContent,
      prepared.value.previewChanges,
    );
  }
  private async exportCurrentNote(): Promise<void> {
    const session = this.reviewSession;
    const active = await this.activeMarkdown(session?.file);
    const view = await this.activateWorkspace();
    const vaultRoot = this.app.vault.adapter.getBasePath?.();
    if (!view || !session || !session.prepared || !active || !vaultRoot) {
      new Notice('請先完成掃描、逐項審核與轉換預覽。');
      view?.setError('請先完成掃描、逐項審核與轉換預覽。');
      return;
    }
    const result = await publishPreparedDocument({
      vaultRoot,
      outputParent: resolve(dirname(vaultRoot), 'Privacy Bridge Outputs'),
      relativePath: active.file.path,
      currentContent: active.content,
      prepared: session.prepared,
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
    view.setOutputResult(result.value.outputFile);
    await this.openSanitizedPreview(active.file.basename, session.prepared.sanitizedContent);
    new Notice('Privacy Bridge 去識別化輸出已完成。');
  }
  private async openSanitizedPreview(title: string, content: string): Promise<void> {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: PRIVACY_BRIDGE_PREVIEW_VIEW, active: true });
    if (leaf.view instanceof PrivacyBridgePreviewView) leaf.view.setDocument(title, content);
    await this.app.workspace.revealLeaf(leaf);
  }
  private async lockWorkspace(): Promise<void> {
    this.reviewSession = undefined;
    for (const leaf of this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_VIEW))
      (leaf as WorkspaceLeaf & { view?: PrivacyBridgeWorkspaceView }).view?.setClientState(
        'LOCKED',
      );
  }
  private async revealOutputFile(path: string): Promise<void> {
    const desktopRequire = (
      window as unknown as {
        require?: (module: string) => { shell?: { showItemInFolder(target: string): void } };
      }
    ).require;
    const shell = desktopRequire?.('electron').shell;
    if (!shell) {
      new Notice('無法開啟系統檔案管理器。');
      return;
    }
    shell.showItemInFolder(path);
  }
}
