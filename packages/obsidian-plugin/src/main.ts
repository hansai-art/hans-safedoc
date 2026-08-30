import { createHash } from 'node:crypto';
import { dirname, extname, resolve } from 'node:path';
import {
  Modal,
  Notice,
  Plugin,
  Platform,
  type App,
  type TFile,
  type WorkspaceLeaf,
} from 'obsidian';
import {
  detectCsvDialect,
  type CsvDialect,
  type CsvDialectCandidate,
} from '../../document-formats/src/csv/adapter.js';
import type { DetectedCandidate } from '@privacy-bridge/core';
import type { ExternalReviewDocument } from './external-format-workflow.js';
import {
  explainExternalFileError,
  openExternalReviewDocument,
  publishExternalReviewedDocument,
} from './external-format-workflow.js';
import { assertDesktopRuntime } from './index.js';
import { PrivacyBridgePreviewView, PRIVACY_BRIDGE_PREVIEW_VIEW } from './preview-view.js';
import { PrivacyBridgeDiffModal } from './diff-modal.js';
import { PrivacyBridgeFirstRunModal } from './first-run-modal.js';
import {
  PrivacyBridgeHelpView,
  PRIVACY_BRIDGE_HELP_VIEW,
  type TutorialStage,
} from './help-view.js';
import { PrivacyBridgeWorkspaceView, PRIVACY_BRIDGE_VIEW } from './workspace.js';
import {
  NOVICE_DEMO_FOLDER,
  NOVICE_DEMO_MARKDOWN,
  FILE_PICKER_EXTENSIONS,
  SECURITY_NOTICE_VERSION,
  normalizeNoviceSettings,
  type NoviceSettings,
} from './novice-support.js';

import {
  prepareReviewedDocument,
  publishPreparedDocument,
  scanSyntheticDocument,
  type CandidateDecision,
  type CandidateDecisions,
  type PreparedReviewedDocument,
} from './workflow.js';

interface ReviewSession {
  readonly file: TFile | undefined;
  readonly externalDocument: ExternalReviewDocument | undefined;
  readonly sourcePath: string;
  readonly sourceContent: string;
  readonly candidates: readonly DetectedCandidate[];
  decisions: CandidateDecisions;
  mandatoryReviewIds: Set<string>;
  prepared: PreparedReviewedDocument | undefined;
  exported: boolean;
}

class CsvDialectModal extends Modal {
  private settled = false;
  constructor(
    app: App,
    private readonly candidates: readonly CsvDialectCandidate[],
    private readonly finish: (dialect: CsvDialect | undefined) => void,
  ) {
    super(app);
  }
  override onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: '這份 CSV 怎麼分欄？' });
    this.contentEl.createEl('p', {
      text: 'Hans SafeDoc 找到不只一種合理結果，無法安全替你決定。一般 Excel 或 Google 試算表匯出的 CSV 通常使用逗號。',
    });
    if (this.candidates.length > 0)
      this.contentEl.createEl('p', {
        text: `預覽結果：${this.candidates
          .map(
            (candidate) =>
              `${candidate.delimiter === '\t' ? 'Tab' : candidate.delimiter} 可解析成 ${candidate.rowCount} 列、${candidate.columnCount} 欄`,
          )
          .join('；')}`,
      });
    const options = [
      ['用逗號分欄（一般 CSV）', ','],
      ['用 Tab 分欄', '\t'],
      ['用分號分欄', ';'],
    ] as const;
    for (const [label, delimiter] of options) {
      if (
        this.candidates.length > 0 &&
        !this.candidates.some((candidate) => candidate.delimiter === delimiter)
      )
        continue;
      const button = this.contentEl.createEl('button', { text: label });
      button.addEventListener('click', () => {
        this.settled = true;
        this.finish({ delimiter, confirmed: true });
        this.close();
      });
    }
  }
  override onClose(): void {
    this.contentEl.empty();
    if (!this.settled) this.finish(undefined);
  }
}

export default class ObsidianPrivacyBridgePlugin extends Plugin {
  private reviewSession: ReviewSession | undefined;
  private diffModal: PrivacyBridgeDiffModal | undefined;
  private firstRunModal: PrivacyBridgeFirstRunModal | undefined;
  private noviceSettings: NoviceSettings = normalizeNoviceSettings(undefined);

  override async onload(): Promise<void> {
    assertDesktopRuntime({ isMobile: Platform.isMobile });
    this.noviceSettings = normalizeNoviceSettings(await this.loadData());
    this.registerView(
      PRIVACY_BRIDGE_VIEW,
      (leaf) =>
        new PrivacyBridgeWorkspaceView(leaf, {
          chooseFile: () => this.chooseExternalFile(),
          scanCurrentNote: async () => {
            await this.scanCurrentNote();
          },
          reviewCandidate: (candidateId, decision) => this.reviewCandidate(candidateId, decision),
          acknowledgeMandatoryReview: (recordId) => this.acknowledgeMandatoryReview(recordId),
          reviewAllCandidates: () => this.reviewAllCandidates(),
          previewCurrentNote: () => this.previewCurrentNote(),
          exportCurrentNote: () => this.exportCurrentNote(),
          revealOutputFile: (path) => this.revealOutputFile(path),
          openOutputFile: (path) => this.openOutputFile(path),
          openSafeOutputPreview: () => this.openCurrentSanitizedPreview(),
          openDiffPreview: () => this.openDiffPreview(),
          openTutorial: () => this.openTutorial(),
        }),
    );
    this.registerView(PRIVACY_BRIDGE_PREVIEW_VIEW, (leaf) => new PrivacyBridgePreviewView(leaf));
    this.registerView(PRIVACY_BRIDGE_HELP_VIEW, (leaf) => new PrivacyBridgeHelpView(leaf));
    this.addRibbonIcon('shield-check', '處理目前文件', () => this.scanCurrentNote());
    this.addCommand({
      id: 'open-dashboard',
      name: 'Hans SafeDoc：開啟工作區',
      callback: () => this.activateWorkspace(),
    });
    this.addCommand({
      id: 'scan-current-note',
      name: 'Hans SafeDoc：掃描目前 MD 筆記',
      callback: () => this.scanCurrentNote(),
    });
    this.addCommand({
      id: 'create-new-job',
      name: 'Hans SafeDoc：建立安全輸出',
      callback: () => this.exportCurrentNote(),
    });
    this.addCommand({
      id: 'lock-current-client',
      name: 'Hans SafeDoc：鎖定工作區',
      callback: () => this.lockWorkspace(),
    });
    this.addCommand({
      id: 'resume-interrupted-job',
      name: 'Hans SafeDoc：繼續未完成工作',
      callback: () => this.activateWorkspace(),
    });
    this.addCommand({
      id: 'open-getting-started',
      name: 'Hans SafeDoc：開啟新手教學',
      callback: () => this.openFirstRunGuide(),
    });
    this.app.workspace.onLayoutReady(() => {
      if (!this.noviceSettings.securityNoticeAccepted || !this.noviceSettings.onboardingCompleted)
        this.openFirstRunGuide();
    });
  }
  private openFirstRunGuide(): void {
    this.firstRunModal?.close();
    this.firstRunModal = new PrivacyBridgeFirstRunModal(this.app, this.noviceSettings, {
      acceptSecurityNotice: () => this.acceptSecurityNotice(),
      completeOnboarding: () => this.completeOnboarding(),
      createNoviceDemo: () => this.createNoviceDemo(),
      useOwnMarkdown: () => this.useOwnMarkdown(),
      disableLocalModel: () => this.disableLocalModel(),
    });
    this.firstRunModal.open();
  }
  private ensureSecurityNoticeAccepted(): boolean {
    if (
      this.noviceSettings.securityNoticeAccepted &&
      this.noviceSettings.securityNoticeVersion === SECURITY_NOTICE_VERSION
    )
      return true;
    this.reviewSession = undefined;
    this.openFirstRunGuide();
    new Notice('請先閱讀並接受目前版本的安全限制，Hans SafeDoc 尚未讀取文件。');
    return false;
  }
  private async acceptSecurityNotice(): Promise<void> {
    this.noviceSettings = {
      ...this.noviceSettings,
      securityNoticeAccepted: true,
      securityNoticeVersion: SECURITY_NOTICE_VERSION,
    };
    await this.saveData(this.noviceSettings);
  }
  private async completeOnboarding(): Promise<void> {
    this.noviceSettings = { ...this.noviceSettings, onboardingCompleted: true };
    await this.saveData(this.noviceSettings);
  }

  private async setLocalModelEnabled(enabled: boolean): Promise<void> {
    this.noviceSettings = { ...this.noviceSettings, localModelEnabled: enabled };
    await this.saveData(this.noviceSettings);
  }
  private async disableLocalModel(): Promise<void> {
    await this.setLocalModelEnabled(false);
  }
  private async detectCandidates(source: string): Promise<readonly DetectedCandidate[]> {
    const deterministic = scanSyntheticDocument(source);
    if (!deterministic.ok) throw new Error(`掃描失敗：${deterministic.error.code}`);
    return deterministic.value;
  }
  private async useOwnMarkdown(): Promise<void> {
    await this.completeOnboarding();
    new Notice('請開啟一篇只含合成資料的 MD 筆記，再點左側盾牌開始掃描。');
  }
  private async createNoviceDemo(): Promise<void> {
    if (!this.app.vault.getFolderByPath(NOVICE_DEMO_FOLDER))
      await this.app.vault.createFolder(NOVICE_DEMO_FOLDER);
    let demoFile: TFile | null = null;
    for (let suffix = 1; suffix <= 100; suffix += 1) {
      const name = suffix === 1 ? '開始練習.md' : `開始練習 ${suffix}.md`;
      const path = `${NOVICE_DEMO_FOLDER}/${name}`;
      const existing = this.app.vault.getFileByPath(path);
      if (!existing) {
        demoFile = await this.app.vault.create(path, NOVICE_DEMO_MARKDOWN);
        break;
      }
      if ((await this.app.vault.read(existing)) === NOVICE_DEMO_MARKDOWN) {
        demoFile = existing;
        break;
      }
    }
    if (!demoFile) throw new Error('Unable to allocate synthetic practice note.');
    await this.app.workspace.getLeaf('tab').openFile(demoFile);
    if (!(await this.scanCurrentNote(demoFile)))
      throw new Error('合成練習筆記已建立，但掃描未成功；首次設定尚未完成。');
    new Notice('已建立並掃描合成練習筆記，請依右側指引完成審核。');
  }
  private async activateWorkspace(): Promise<PrivacyBridgeWorkspaceView | null> {
    const existing = this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_VIEW)[0];
    const leaf = existing ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) return null;
    if (!existing) await leaf.setViewState({ type: PRIVACY_BRIDGE_VIEW, active: true });
    await this.app.workspace.revealLeaf(leaf);
    return leaf.view instanceof PrivacyBridgeWorkspaceView ? leaf.view : null;
  }
  private async chooseExternalFile(): Promise<void> {
    if (!this.ensureSecurityNoticeAccepted()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = FILE_PICKER_EXTENSIONS.map((extension) => `.${extension}`).join(',');
    input.hidden = true;
    document.body.append(input);
    let view: PrivacyBridgeWorkspaceView | null = null;
    try {
      const selected = await new Promise<File | undefined>((resolveSelection) => {
        input.addEventListener('change', () => resolveSelection(input.files?.[0]), { once: true });
        input.addEventListener('cancel', () => resolveSelection(undefined), { once: true });
        input.click();
      });
      if (!selected) return;
      this.reviewSession = undefined;
      view = await this.activateWorkspace();
      view?.resetSelection();
      const desktopRequire = (
        window as unknown as {
          require?: (module: string) => {
            webUtils?: { getPathForFile(file: File): string };
          };
        }
      ).require;
      const webUtils = desktopRequire?.('electron').webUtils;
      const path = webUtils ? webUtils.getPathForFile(selected) : '';
      if (!path) {
        new Notice('無法取得本機檔案路徑；為保護來源，Hans SafeDoc 已停止處理。');
        view?.setError('無法取得本機檔案路徑，未讀取檔案。');
        return;
      }
      const isCsv = extname(path).toLowerCase() === '.csv';
      let csvDialect: CsvDialect | undefined;
      if (isCsv) {
        const detected = detectCsvDialect(Buffer.from(await selected.arrayBuffer()));
        csvDialect =
          detected.status === 'DETECTED'
            ? detected.dialect
            : await new Promise<CsvDialect | undefined>((resolveDialect) =>
                new CsvDialectModal(this.app, detected.candidates, resolveDialect).open(),
              );
      }
      if (isCsv && !csvDialect) {
        new Notice('尚未選擇這份 CSV 的分欄方式，未讀取檔案。');
        view?.setError('尚未選擇這份 CSV 的分欄方式，未讀取檔案。');
        return;
      }
      const opened = await openExternalReviewDocument(path, csvDialect, (source) =>
        this.detectCandidates(source),
      );
      if (!view) return;
      if (opened.status === 'PDF_AGENT_ONLY') {
        view.setError(opened.message);
        new Notice(opened.message);
        return;
      }
      this.reviewSession = {
        file: undefined,
        externalDocument: opened.document,
        sourcePath: opened.document.path,
        sourceContent: opened.document.sourceContent,
        candidates: opened.document.candidates,
        decisions: {},
        mandatoryReviewIds: new Set(),
        prepared: undefined,
        exported: false,
      };
      view.setScanResult(
        opened.document.path,
        opened.document.candidates,
        opened.document.mandatoryReviewRecords,
        opened.document.kind,
        opened.document.candidateLocations,
      );
    } catch (error) {
      const message = explainExternalFileError(error);
      this.reviewSession = undefined;
      view ??= await this.activateWorkspace();
      view?.resetSelection();
      view?.setError(message);
    } finally {
      input.remove();
    }
  }
  private async activeMarkdown(file = this.app.workspace.getActiveFile()): Promise<{
    file: TFile;
    content: string;
  } | null> {
    if (!file || file.extension.toLowerCase() !== 'md') return null;
    return { file, content: await this.app.vault.read(file) };
  }
  private async scanCurrentNote(file = this.app.workspace.getActiveFile()): Promise<boolean> {
    if (!this.ensureSecurityNoticeAccepted()) return false;
    const active = await this.activeMarkdown(file);
    const view = await this.activateWorkspace();
    if (!view || !active) {
      new Notice('請先打開要測試的 MD 筆記。');
      view?.setError('請先打開要測試的 MD 筆記。');
      return false;
    }
    let candidates: readonly DetectedCandidate[];
    try {
      candidates = await this.detectCandidates(active.content);
    } catch (error) {
      view.setError(error instanceof Error ? error.message : '掃描失敗。');
      return false;
    }
    this.reviewSession = {
      file: active.file,
      externalDocument: undefined,
      sourcePath: active.file.path,
      sourceContent: active.content,
      candidates,
      decisions: {},
      mandatoryReviewIds: new Set(),
      prepared: undefined,
      exported: false,
    };
    view.setScanResult(active.file.path, candidates);
    return true;
  }
  private async reviewCandidate(candidateId: string, decision: CandidateDecision): Promise<void> {
    const session = this.reviewSession;
    const candidate = session?.candidates.find((item) => item.candidateId === candidateId);
    if (!session || !candidate || candidate.handling === 'BLOCK_EXPORT') return;
    session.decisions = { ...session.decisions, [candidateId]: decision };
    session.prepared = undefined;
    session.exported = false;
    const view = await this.activateWorkspace();
    view?.setReviewDecision(candidateId, decision);
  }
  private async acknowledgeMandatoryReview(recordId: string): Promise<void> {
    const session = this.reviewSession;
    if (!session?.externalDocument?.mandatoryReviewRecords.some((record) => record.id === recordId))
      return;
    session.mandatoryReviewIds.add(recordId);
    session.prepared = undefined;
    session.exported = false;
    const view = await this.activateWorkspace();
    view?.setMandatoryReviewAcknowledged(recordId);
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
    session.exported = false;
    view.setAllReviewDecisions(accepted);
    if (
      session.externalDocument &&
      new Set(session.externalDocument.mandatoryReviewRecords.map((record) => record.id)).size !==
        session.mandatoryReviewIds.size
    )
      return;
    await this.previewCurrentNote();
  }
  private async previewCurrentNote(): Promise<void> {
    if (!this.ensureSecurityNoticeAccepted()) return;
    const session = this.reviewSession;
    const view = await this.activateWorkspace();
    if (!session || !view) return;
    if (
      session.externalDocument &&
      new Set(session.externalDocument.mandatoryReviewRecords.map((record) => record.id)).size !==
        session.mandatoryReviewIds.size
    ) {
      new Notice('仍有強制人工確認項目尚未逐項確認。');
      return;
    }
    if (session.externalDocument) {
      try {
        await session.externalDocument.source.recheck('before-rewrite');
      } catch {
        view.setError('來源文件在審核期間已變更，請重新選擇。');
        return;
      }
    } else {
      const active = await this.activeMarkdown(session.file);
      const sourceHash = createHash('sha256')
        .update(active?.content ?? '', 'utf8')
        .digest('hex');
      const expectedHash = createHash('sha256').update(session.sourceContent, 'utf8').digest('hex');
      if (!active || sourceHash !== expectedHash) {
        view.setError('來源文件在審核期間已變更，請重新掃描。');
        return;
      }
    }
    const prepared = prepareReviewedDocument(
      session.sourceContent,
      session.candidates,
      session.decisions,
    );
    if (!prepared.ok) {
      view.setError(
        prepared.error.code === 'PB-REVIEW-001'
          ? '仍有項目尚未確認。'
          : `無法建立預覽：${prepared.error.code}`,
      );
      return;
    }
    session.prepared = prepared.value;
    view.setPreview(
      prepared.value.sourceContent,
      prepared.value.sanitizedContent,
      prepared.value.previewChanges,
      prepared.value.previewHunks,
    );
  }
  private async exportCurrentNote(): Promise<void> {
    if (!this.ensureSecurityNoticeAccepted()) return;
    const session = this.reviewSession;
    const view = await this.activateWorkspace();
    if (!view || !session || !session.prepared) {
      new Notice('請先完成掃描、逐項審核與轉換預覽。');
      view?.setError('請先完成掃描、逐項審核與轉換預覽。');
      return;
    }
    if (session.externalDocument) {
      try {
        const vaultRoot = this.app.vault.adapter.getBasePath?.();
        if (!vaultRoot) throw new Error('無法確認 Obsidian 資料庫路徑');
        const outputFile = await publishExternalReviewedDocument({
          document: session.externalDocument,
          prepared: session.prepared,
          mandatoryReviewIds: [...session.mandatoryReviewIds],
          outputParent: resolve(dirname(vaultRoot), 'Hans SafeDoc Outputs'),
        });
        view.setOutputResult(outputFile);
        session.exported = true;
        await this.openSanitizedPreview(session.prepared.sanitizedContent);
        new Notice('Hans SafeDoc 已完成 adapter 改寫、重新開啟與殘留檢查，安全副本已建立。');
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知錯誤';
        view.setError(`安全副本未建立：${message}`);
        new Notice('驗證未通過，未顯示或發布安全副本。');
      }
      return;
    }
    const active = await this.activeMarkdown(session.file);
    const vaultRoot = this.app.vault.adapter.getBasePath?.();
    if (!active || !vaultRoot) {
      view.setError('來源筆記或 Obsidian 資料庫路徑已無法讀取。');
      return;
    }
    const result = await publishPreparedDocument({
      vaultRoot,
      outputParent: resolve(dirname(vaultRoot), 'Hans SafeDoc Outputs'),
      relativePath: active.file.path,
      currentContent: active.content,
      prepared: session.prepared,
    });
    if (!result.ok) {
      const message =
        result.error.code === 'PB-DEMO-SECRET-BLOCK'
          ? '偵測到機密字串，依安全規則禁止輸出。'
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
    session.exported = true;
    await this.openSanitizedPreview(session.prepared.sanitizedContent);
    new Notice('Hans SafeDoc 安全代碼化輸出已完成。');
  }
  private async openSanitizedPreview(content: string): Promise<void> {
    await this.openDocumentPreview(content);
  }
  private async openDocumentPreview(content: string): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_PREVIEW_VIEW)[0];
    const leaf = existing ?? this.app.workspace.getLeaf('tab');
    if (!existing) await leaf.setViewState({ type: PRIVACY_BRIDGE_PREVIEW_VIEW, active: true });
    if (leaf.view instanceof PrivacyBridgePreviewView) leaf.view.setDocument(content);
    await this.app.workspace.revealLeaf(leaf);
  }
  private async openCurrentSanitizedPreview(): Promise<void> {
    const session = this.reviewSession;
    if (!session?.prepared) {
      new Notice('請先建立轉換預覽。');
      return;
    }
    await this.openSanitizedPreview(session.prepared.sanitizedContent);
  }
  private async openDiffPreview(): Promise<void> {
    const session = this.reviewSession;
    if (!session?.prepared) {
      new Notice('請先建立轉換預覽。');
      return;
    }
    this.diffModal?.close();
    this.diffModal = new PrivacyBridgeDiffModal(this.app, session.prepared.previewHunks);
    this.diffModal.open();
  }
  private tutorialStage(): TutorialStage {
    const session = this.reviewSession;
    if (!session) return 'NOT_SCANNED';
    if (session.exported) return 'EXPORTED';
    if (session.prepared) return 'PREVIEW_READY';
    return 'SCANNED';
  }
  private async openTutorial(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_HELP_VIEW)[0];
    const leaf = existing ?? this.app.workspace.getLeaf('tab');
    if (!existing) await leaf.setViewState({ type: PRIVACY_BRIDGE_HELP_VIEW, active: true });
    if (leaf.view instanceof PrivacyBridgeHelpView) leaf.view.setStage(this.tutorialStage());
    await this.app.workspace.revealLeaf(leaf);
  }
  private async lockWorkspace(): Promise<void> {
    this.diffModal?.close();
    this.diffModal = undefined;
    this.reviewSession = undefined;
    for (const leaf of this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_VIEW))
      (leaf as WorkspaceLeaf & { view?: PrivacyBridgeWorkspaceView }).view?.setClientState(
        'LOCKED',
      );
    for (const leaf of this.app.workspace.getLeavesOfType(PRIVACY_BRIDGE_PREVIEW_VIEW))
      (leaf as WorkspaceLeaf & { view?: PrivacyBridgePreviewView }).view?.clearSensitiveContent();
  }
  override onunload(): void {
    this.firstRunModal?.close();
    this.firstRunModal = undefined;
    this.diffModal?.close();
    this.diffModal = undefined;
    this.reviewSession = undefined;
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
  private async openOutputFile(path: string): Promise<void> {
    const desktopRequire = (
      window as unknown as {
        require?: (module: string) => { shell?: { openPath(target: string): Promise<string> } };
      }
    ).require;
    const shell = desktopRequire?.('electron').shell;
    if (!shell) {
      new Notice('無法使用系統預設程式開啟安全檔案。');
      return;
    }
    const error = await shell.openPath(path);
    if (error) new Notice('系統無法開啟安全檔案，請改用「顯示輸出位置」。');
  }
}
