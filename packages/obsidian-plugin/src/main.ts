import { createHash } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { homedir } from 'node:os';
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
import {
  DICTIONARY_LIMITS,
  defaultSecureStorePath,
  listSafeJobRecords,
  loadSafeJobRecord,
  matchDictionary,
  mergeCandidateDetections,
  saveSafeJobRecord,
  validateDictionaryImport,
  validateSecureStorePath,
  type DesktopPlatform,
  type DetectedCandidate,
  type Dictionary,
  type SafeJobSummary,
} from '@privacy-bridge/core';
import type { ExternalReviewDocument } from './external-format-workflow.js';
import {
  explainExternalFileError,
  openExternalReviewDocument,
  publishExternalReviewedDocument,
} from './external-format-workflow.js';
import { assertDesktopRuntime } from './index.js';
import { createAnalysisBundle, type AnalysisBundle } from './analysis-request.js';
import { restoreSafeResultFile } from './restore-workflow.js';
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

interface StorePassphraseSelection {
  readonly passphrase: string;
  readonly jobId?: string;
}

class StorePassphraseModal extends Modal {
  private settled = false;
  private passphraseInput: HTMLInputElement | undefined;
  private confirmationInput: HTMLInputElement | undefined;

  constructor(
    app: App,
    private readonly mode: 'CREATE' | 'RESTORE',
    private readonly jobs: readonly SafeJobSummary[],
    private readonly finish: (selection: StorePassphraseSelection | undefined) => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl('h2', {
      text: this.mode === 'CREATE' ? '設定這次 Job 的還原密碼' : '驗證並還原 AI 結果',
    });
    this.contentEl.createEl('p', {
      text:
        this.mode === 'CREATE'
          ? '密碼只用來加密儲存在系統應用程式資料夾的本機對照表，不會寫入 Vault、外掛設定或安全輸出。Hans SafeDoc 無法替你找回遺失的密碼。'
          : '選擇建立安全輸出時的 Job，並輸入當時設定的密碼。密碼不會儲存。',
    });
    let jobSelect: HTMLSelectElement | undefined;
    if (this.mode === 'RESTORE') {
      const label = this.contentEl.createEl('label', { text: '本機 Job' });
      jobSelect = label.createEl('select');
      for (const job of this.jobs)
        jobSelect.createEl('option', {
          text: `${job.jobId} · ${new Date(job.createdAt).toLocaleString('zh-TW')}`,
          value: job.jobId,
        });
    }
    const passphraseLabel = this.contentEl.createEl('label', { text: '密碼（12–256 個字元）' });
    this.passphraseInput = passphraseLabel.createEl('input', {
      type: 'password',
      attr: {
        autocomplete: this.mode === 'CREATE' ? 'new-password' : 'current-password',
        spellcheck: 'false',
      },
    });
    if (this.mode === 'CREATE') {
      const confirmationLabel = this.contentEl.createEl('label', { text: '再次輸入密碼' });
      this.confirmationInput = confirmationLabel.createEl('input', {
        type: 'password',
        attr: { autocomplete: 'new-password', spellcheck: 'false' },
      });
    }
    const status = this.contentEl.createEl('p', { attr: { 'aria-live': 'polite' } });
    const cancel = this.contentEl.createEl('button', { text: '取消' });
    const confirm = this.contentEl.createEl('button', {
      text: this.mode === 'CREATE' ? '加密儲存並建立輸出' : '驗證並建立還原副本',
      cls: 'mod-cta',
    });
    const validate = () => {
      const passphrase = this.passphraseInput?.value ?? '';
      const length = [...passphrase].length;
      const matches = this.mode === 'RESTORE' || passphrase === this.confirmationInput?.value;
      confirm.disabled = length < 12 || length > 256 || !matches;
      status.textContent =
        this.mode === 'CREATE' && length >= 12 && !matches ? '兩次輸入的密碼不一致。' : '';
    };
    this.passphraseInput.addEventListener('input', validate);
    this.confirmationInput?.addEventListener('input', validate);
    cancel.addEventListener('click', () => this.close());
    confirm.addEventListener('click', () => {
      const passphrase = this.passphraseInput?.value ?? '';
      this.settled = true;
      this.finish({ passphrase, ...(jobSelect ? { jobId: jobSelect.value } : {}) });
      this.close();
    });
    validate();
    queueMicrotask(() => this.passphraseInput?.focus());
  }

  override onClose(): void {
    if (this.passphraseInput) this.passphraseInput.value = '';
    if (this.confirmationInput) this.confirmationInput.value = '';
    this.contentEl.empty();
    if (!this.settled) this.finish(undefined);
  }
}

export default class ObsidianPrivacyBridgePlugin extends Plugin {
  private reviewSession: ReviewSession | undefined;
  private sessionDictionary: Dictionary | undefined;
  private diffModal: PrivacyBridgeDiffModal | undefined;
  private firstRunModal: PrivacyBridgeFirstRunModal | undefined;
  private noviceSettings: NoviceSettings = normalizeNoviceSettings(undefined);

  private discardPrepared(session: ReviewSession | undefined): void {
    session?.prepared?.tokenKey.fill(0);
    if (session) session.prepared = undefined;
  }
  private clearReviewSession(): void {
    this.discardPrepared(this.reviewSession);
    this.reviewSession = undefined;
  }

  override async onload(): Promise<void> {
    assertDesktopRuntime({ isMobile: Platform.isMobile });
    this.noviceSettings = normalizeNoviceSettings(await this.loadData());
    this.registerView(
      PRIVACY_BRIDGE_VIEW,
      (leaf) =>
        new PrivacyBridgeWorkspaceView(leaf, {
          chooseFile: () => this.chooseExternalFile(),
          importDictionary: () => this.importDictionary(),
          restoreResult: () => this.restoreResult(),
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
      name: '開啟工作區',
      callback: () => this.activateWorkspace(),
    });
    this.addCommand({
      id: 'scan-current-note',
      name: '掃描目前 MD 筆記',
      callback: () => this.scanCurrentNote(),
    });
    this.addCommand({
      id: 'create-new-job',
      name: '建立安全輸出',
      callback: () => this.exportCurrentNote(),
    });
    this.addCommand({
      id: 'restore-ai-result',
      name: '還原 AI 處理結果',
      callback: () => this.restoreResult(),
    });
    this.addCommand({
      id: 'import-session-dictionary',
      name: '匯入工作階段客戶字典',
      callback: () => this.importDictionary(),
    });
    this.addCommand({
      id: 'lock-current-client',
      name: '鎖定工作區',
      callback: () => this.lockWorkspace(),
    });
    this.addCommand({
      id: 'resume-interrupted-job',
      name: '繼續未完成工作',
      callback: () => this.activateWorkspace(),
    });
    this.addCommand({
      id: 'open-getting-started',
      name: '開啟新手教學',
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
    this.clearReviewSession();
    this.sessionDictionary = undefined;
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
  private secureStoreRoot(vaultRoot: string): string {
    const platform = process.platform;
    if (platform !== 'darwin' && platform !== 'win32' && platform !== 'linux')
      throw new Error('此桌面作業系統尚未支援安全 Job Store。');
    const candidate = defaultSecureStorePath(platform as DesktopPlatform, homedir());
    const parent = dirname(vaultRoot);
    const validated = validateSecureStorePath({
      candidate,
      vaultRoot,
      shadowRoots: [resolve(parent, 'Hans SafeDoc Outputs')],
      resultRoots: [resolve(parent, 'Hans SafeDoc Restored')],
    });
    if (!validated.ok) throw new Error('安全 Job Store 不得位於 Vault 或輸出資料夾內。');
    return validated.value;
  }
  private requestStorePassphrase(
    mode: 'CREATE' | 'RESTORE',
    jobs: readonly SafeJobSummary[] = [],
  ): Promise<StorePassphraseSelection | undefined> {
    return new Promise((resolveSelection) =>
      new StorePassphraseModal(this.app, mode, jobs, resolveSelection).open(),
    );
  }
  private async chooseRestoreFile(): Promise<string | undefined> {
    const input = document.body.createEl('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    try {
      const selected = await new Promise<File | undefined>((resolveSelection) => {
        input.addEventListener('change', () => resolveSelection(input.files?.[0]), { once: true });
        input.addEventListener('cancel', () => resolveSelection(undefined), { once: true });
        input.click();
      });
      if (!selected) return undefined;
      const desktopRequire = (
        window as unknown as {
          require?: (module: string) => {
            webUtils?: { getPathForFile(file: File): string };
          };
        }
      ).require;
      return desktopRequire?.('electron').webUtils?.getPathForFile(selected) || undefined;
    } finally {
      input.remove();
    }
  }
  private async restoreResult(): Promise<void> {
    if (!this.ensureSecurityNoticeAccepted()) return;
    const vaultRoot = this.app.vault.adapter.getBasePath?.();
    if (!vaultRoot) {
      new Notice('無法確認 Obsidian 資料庫路徑，未讀取結果檔。');
      return;
    }
    const sourcePath = await this.chooseRestoreFile();
    if (!sourcePath) return;
    let secureRoot: string;
    try {
      secureRoot = this.secureStoreRoot(vaultRoot);
    } catch (cause) {
      new Notice(cause instanceof Error ? cause.message : '無法開啟安全 Job Store。');
      return;
    }
    const listed = await listSafeJobRecords(secureRoot);
    if (!listed.ok || listed.value.length === 0) {
      new Notice('找不到可用的本機 Job 對照表，未讀取或還原結果。');
      return;
    }
    const selection = await this.requestStorePassphrase('RESTORE', listed.value);
    if (!selection?.jobId) return;
    const loaded = await loadSafeJobRecord(secureRoot, selection.jobId, selection.passphrase);
    if (!loaded.ok) {
      new Notice('密碼錯誤，或 Job 對照表完整性驗證失敗；沒有建立還原檔。');
      return;
    }
    try {
      const output = await restoreSafeResultFile({
        sourcePath,
        outputParent: resolve(dirname(vaultRoot), 'Hans SafeDoc Restored'),
        job: loaded.value,
      });
      const view = await this.activateWorkspace();
      view?.setRestoredOutputResult(output, loaded.value.jobId);
      new Notice('安全代碼與 Job 完整性驗證通過，已建立新的還原副本。');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '未知錯誤';
      const view = await this.activateWorkspace();
      view?.setError(`沒有建立還原檔：${message}`);
      new Notice('還原驗證未通過，沒有建立任何結果檔。');
    } finally {
      loaded.value.tokenKey.fill(0);
    }
  }
  private async importDictionary(): Promise<void> {
    if (!this.ensureSecurityNoticeAccepted()) return;
    const input = document.body.createEl('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    try {
      const selected = await new Promise<File | undefined>((resolveSelection) => {
        input.addEventListener('change', () => resolveSelection(input.files?.[0]), { once: true });
        input.addEventListener('cancel', () => resolveSelection(undefined), { once: true });
        input.click();
      });
      if (!selected) return;
      if (selected.size > DICTIONARY_LIMITS.bytes) {
        new Notice('字典超過 25 MB，未讀取檔案。');
        return;
      }
      const parsed = validateDictionaryImport(new Uint8Array(await selected.arrayBuffer()));
      if (!parsed.ok) {
        new Notice(`字典格式或安全限制驗證失敗：${parsed.error.code}。`);
        return;
      }
      this.clearReviewSession();
      this.sessionDictionary = parsed.value;
      const view = await this.activateWorkspace();
      view?.resetSelection();
      view?.setDictionaryState(parsed.value.entries.length);
      new Notice(
        `已載入 ${parsed.value.entries.length} 筆客戶字典；只保留於本次工作階段，請重新掃描文件。`,
      );
    } finally {
      input.remove();
    }
  }
  private async bindPublishedOutput(input: {
    readonly outputFile: string;
    readonly outputRoot?: string;
    readonly secureRoot: string;
    readonly passphrase: string;
    readonly prepared: PreparedReviewedDocument;
  }): Promise<AnalysisBundle> {
    let bundle: AnalysisBundle | undefined;
    try {
      bundle = await createAnalysisBundle({
        outputFile: input.outputFile,
        prepared: input.prepared,
      });
      const saved = await saveSafeJobRecord({
        secureRoot: input.secureRoot,
        jobId: input.prepared.jobId,
        sourceSha256: input.prepared.sourceSha256,
        packageHash: bundle.packageHash,
        documentIds: [input.prepared.documentId],
        tokenKey: input.prepared.tokenKey,
        entities: input.prepared.mapping,
        passphrase: input.passphrase,
      });
      if (!saved.ok) throw new Error(`加密 Job 對照表未建立：${saved.error.code}`);
      input.prepared.tokenKey.fill(0);
      return bundle;
    } catch (cause) {
      if (input.outputRoot) await rm(input.outputRoot, { recursive: true, force: true });
      else {
        if (bundle) {
          await rm(bundle.safePackageFile, { force: true });
          await rm(bundle.analysisRequestFile, { force: true });
        }
        await rm(input.outputFile, { force: true });
      }
      throw cause;
    }
  }
  private async detectCandidates(source: string): Promise<readonly DetectedCandidate[]> {
    const deterministic = scanSyntheticDocument(source);
    if (!deterministic.ok) throw new Error(`掃描失敗：${deterministic.error.code}`);
    if (!this.sessionDictionary) return deterministic.value;
    return mergeCandidateDetections(
      deterministic.value,
      matchDictionary(source, this.sessionDictionary),
    );
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
    const view = leaf.view instanceof PrivacyBridgeWorkspaceView ? leaf.view : null;
    view?.setDictionaryState(this.sessionDictionary?.entries.length ?? 0);
    return view;
  }
  private async chooseExternalFile(): Promise<void> {
    if (!this.ensureSecurityNoticeAccepted()) return;
    const input = document.body.createEl('input');
    input.type = 'file';
    input.accept = FILE_PICKER_EXTENSIONS.map((extension) => `.${extension}`).join(',');
    input.hidden = true;

    let view: PrivacyBridgeWorkspaceView | null = null;
    try {
      const selected = await new Promise<File | undefined>((resolveSelection) => {
        input.addEventListener('change', () => resolveSelection(input.files?.[0]), { once: true });
        input.addEventListener('cancel', () => resolveSelection(undefined), { once: true });
        input.click();
      });
      if (!selected) return;
      this.clearReviewSession();
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
      this.clearReviewSession();
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
      this.clearReviewSession();
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
    this.clearReviewSession();
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
    this.discardPrepared(session);
    session.exported = false;
    const view = await this.activateWorkspace();
    view?.setReviewDecision(candidateId, decision);
  }
  private async acknowledgeMandatoryReview(recordId: string): Promise<void> {
    const session = this.reviewSession;
    if (!session?.externalDocument?.mandatoryReviewRecords.some((record) => record.id === recordId))
      return;
    session.mandatoryReviewIds.add(recordId);
    this.discardPrepared(session);
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
    this.discardPrepared(session);
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
    this.discardPrepared(session);
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
    if (session.exported) {
      new Notice('這個 Job 已完成輸出；若要建立另一個獨立 Job，請重新掃描文件。');
      return;
    }
    const vaultRoot = this.app.vault.adapter.getBasePath?.();
    if (!vaultRoot) {
      view.setError('無法確認 Obsidian 資料庫路徑。');
      return;
    }
    const selection = await this.requestStorePassphrase('CREATE');
    if (!selection) return;
    let secureRoot: string;
    try {
      secureRoot = this.secureStoreRoot(vaultRoot);
    } catch (cause) {
      view.setError(cause instanceof Error ? cause.message : '無法建立安全 Job Store。');
      return;
    }
    if (session.externalDocument) {
      try {
        const outputFile = await publishExternalReviewedDocument({
          document: session.externalDocument,
          prepared: session.prepared,
          mandatoryReviewIds: [...session.mandatoryReviewIds],
          outputParent: resolve(dirname(vaultRoot), 'Hans SafeDoc Outputs'),
        });
        const bundle = await this.bindPublishedOutput({
          outputFile,
          secureRoot,
          passphrase: selection.passphrase,
          prepared: session.prepared,
        });
        view.setOutputResult(
          outputFile,
          session.prepared.jobId,
          bundle.safePackageFile,
          bundle.analysisRequestFile,
        );
        session.exported = true;
        try {
          await this.openSanitizedPreview(session.prepared.sanitizedContent);
        } catch {
          new Notice('輸出已安全建立，但無法自動開啟預覽；可從輸出位置手動檢查。');
        }
        new Notice(
          `安全副本、分析請求與加密 Job 對照表已建立（${session.prepared.jobId}）。請妥善保管還原密碼。`,
        );
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '未知錯誤';
        view.setError(`安全副本未建立：${message}`);
        new Notice('驗證未通過，未顯示或發布安全副本。');
      }
      return;
    }
    const active = await this.activeMarkdown(session.file);
    if (!active) {
      view.setError('來源筆記已無法讀取。');
      return;
    }
    const result = await publishPreparedDocument({
      vaultRoot,
      configDir: this.app.vault.configDir,
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
      await rm(result.value.outputRoot, { recursive: true, force: true });
      view.setError('來源文件在處理期間已變更，已移除本次輸出。');
      new Notice('來源文件在處理期間已變更。');
      return;
    }
    try {
      const bundle = await this.bindPublishedOutput({
        outputFile: result.value.outputFile,
        outputRoot: result.value.outputRoot,
        secureRoot,
        passphrase: selection.passphrase,
        prepared: session.prepared,
      });
      view.setOutputResult(
        result.value.outputFile,
        session.prepared.jobId,
        bundle.safePackageFile,
        bundle.analysisRequestFile,
      );
      session.exported = true;
      try {
        await this.openSanitizedPreview(session.prepared.sanitizedContent);
      } catch {
        new Notice('輸出已安全建立，但無法自動開啟預覽；可從輸出位置手動檢查。');
      }
      new Notice(
        `安全代碼化輸出、分析請求與加密 Job 對照表已完成（${session.prepared.jobId}）。請妥善保管還原密碼。`,
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '未知錯誤';
      view.setError(`安全輸出未完成：${message}`);
      new Notice('Job 綁定驗證未通過，已移除本次輸出。');
    }
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
    this.clearReviewSession();
    this.sessionDictionary = undefined;
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
    this.clearReviewSession();
    this.sessionDictionary = undefined;
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
