import { ItemView, type WorkspaceLeaf } from 'obsidian';
import {
  clearSensitiveUiState,
  disabledReasons,
  type ClientUiState,
  type WorkflowBlockers,
} from './ui-state.js';
import type { DetectedCandidate } from '@privacy-bridge/core';
import type { CandidateDecision, PreviewChange } from './workflow.js';

export const PRIVACY_BRIDGE_VIEW = 'privacy-bridge-workspace';

export interface PrivacyBridgeWorkspaceActions {
  scanCurrentNote(): Promise<void>;
  reviewCandidate(candidateId: string, decision: CandidateDecision): Promise<void>;
  reviewAllCandidates(): Promise<void>;
  previewCurrentNote(): Promise<void>;
  exportCurrentNote(): Promise<void>;
  revealOutputFile(path: string): Promise<void>;
}

/** The view owns only display state. Keys and raw values stay in the secure workflow layer. */
export class PrivacyBridgeWorkspaceView extends ItemView {
  private clientState: ClientUiState = 'LOCKED';
  private blockers: WorkflowBlockers = {};
  private sensitive = clearSensitiveUiState();
  private sourcePath: string | undefined;
  private candidates: readonly DetectedCandidate[] = [];
  private decisions = new Map<string, CandidateDecision>();
  private preview: string | undefined;
  private previewSource: string | undefined;
  private previewChanges: readonly PreviewChange[] = [];
  private previewMode: 'BEFORE' | 'AFTER' = 'AFTER';
  private outputFile: string | undefined;
  private statusMessage: string | undefined;
  private batchConfirmation = false;

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
      this.decisions.clear();
      this.clearPreview();
      this.outputFile = undefined;
    }
    this.render();
  }
  setScanResult(sourcePath: string, candidates: readonly DetectedCandidate[]): void {
    this.clientState = 'UNLOCKED';
    this.sourcePath = sourcePath;
    this.candidates = candidates;
    this.decisions.clear();
    this.clearPreview();
    this.outputFile = undefined;
    this.statusMessage = `找到 ${candidates.length} 個候選項目。`;
    this.render();
  }
  setReviewDecision(candidateId: string, decision: CandidateDecision): void {
    this.decisions.set(candidateId, decision);
    this.clearPreview();
    const pending = this.candidates.filter(
      (candidate) =>
        candidate.handling !== 'BLOCK_EXPORT' && !this.decisions.has(candidate.candidateId),
    ).length;
    this.statusMessage =
      pending === 0 ? '所有候選均已審核，可建立預覽。' : `尚有 ${pending} 個候選未審核。`;
    this.render();
  }
  setAllReviewDecisions(candidateIds: readonly string[]): void {
    for (const candidateId of candidateIds) this.decisions.set(candidateId, 'ACCEPTED');
    this.batchConfirmation = false;
    this.clearPreview();
    this.statusMessage = '所有可處理候選均已接受，正在建立預覽。';
    this.render();
  }
  setPreview(source: string, preview: string, changes: readonly PreviewChange[]): void {
    this.previewSource = source;
    this.preview = preview;
    this.previewChanges = changes;
    this.previewMode = 'AFTER';
    this.statusMessage = '預覽已建立；確認後可輸出到 Vault 外。';
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
    this.decisions.clear();
    this.clearPreview();
  }
  private clearPreview(): void {
    this.preview = undefined;
    this.previewSource = undefined;
    this.previewChanges = [];
    this.previewMode = 'AFTER';
  }
  private render(): void {
    const reasons = disabledReasons(this.blockers);
    const pending = this.candidates.filter(
      (candidate) =>
        candidate.handling !== 'BLOCK_EXPORT' && !this.decisions.has(candidate.candidateId),
    ).length;
    const hasBlocked = this.candidates.some((candidate) => candidate.handling === 'BLOCK_EXPORT');
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
    if (this.candidates.length > 0 && !this.preview) {
      section.createEl('h3', { text: '偵測結果' });
      section.createEl(
        'ul',
        { cls: 'privacy-bridge-candidates', attr: { 'aria-label': '去識別化候選項目' } },
        (list) =>
          this.candidates.forEach((candidate) => {
            list.createEl('li', { cls: 'privacy-bridge-candidate' }, (item) => {
              const decision = this.decisions.get(candidate.candidateId);
              item.createEl('span', {
                cls: 'privacy-bridge-candidate-label',
                text: `${candidate.primaryType}：${candidate.surfaceText}（${
                  candidate.handling === 'BLOCK_EXPORT' ? '禁止輸出' : (decision ?? '待審核')
                }）`,
              });
              if (candidate.handling !== 'BLOCK_EXPORT') {
                const accept = item.createEl('button', {
                  text: '接受並去識別化',
                  attr: { 'aria-label': `接受 ${candidate.primaryType}` },
                });
                accept.addEventListener(
                  'click',
                  () => void this.actions.reviewCandidate(candidate.candidateId, 'ACCEPTED'),
                );
                const ignore = item.createEl('button', {
                  text: '忽略並保留原文',
                  attr: { 'aria-label': `忽略 ${candidate.primaryType}` },
                });
                ignore.addEventListener(
                  'click',
                  () => void this.actions.reviewCandidate(candidate.candidateId, 'IGNORED'),
                );
              }
            });
          }),
      );
      if (pending > 0 && !hasBlocked) {
        const acceptAll = section.createEl('button', {
          text: `全部去識別化並預覽（${pending} 項）`,
          attr: { 'aria-label': `批次接受 ${pending} 個候選並建立預覽` },
        });
        acceptAll.addEventListener('click', () => {
          this.batchConfirmation = true;
          this.render();
        });
      }
      if (this.batchConfirmation) {
        section.createDiv({ cls: 'privacy-bridge-batch-confirmation' }, (confirmation) => {
          confirmation.createEl('p', {
            text: `將接受並去識別化 ${pending} 個候選，範例如下：`,
          });
          confirmation.createEl('ul', {}, (examples) =>
            this.candidates
              .filter(
                (candidate) =>
                  candidate.handling !== 'BLOCK_EXPORT' &&
                  !this.decisions.has(candidate.candidateId),
              )
              .slice(0, 3)
              .forEach((candidate) =>
                examples.createEl('li', {
                  text: `${candidate.primaryType}：${candidate.surfaceText}`,
                }),
              ),
          );
          const cancel = confirmation.createEl('button', { text: '取消' });
          cancel.addEventListener('click', () => {
            this.batchConfirmation = false;
            this.render();
          });
          const confirm = confirmation.createEl('button', {
            text: '確認全部去識別化',
            attr: { 'aria-label': '確認批次去識別化' },
          });
          confirm.addEventListener('click', () => void this.actions.reviewAllCandidates());
          queueMicrotask(() => cancel.focus());
        });
      }
    }
    if (!this.preview) {
      const previewButton = section.createEl('button', {
        text: '建立轉換預覽',
        attr: { 'aria-label': 'Privacy Bridge: preview sanitized output' },
      });
      previewButton.disabled =
        this.clientState === 'LOCKED' || this.candidates.length === 0 || pending > 0 || hasBlocked;
      previewButton.addEventListener('click', () => void this.actions.previewCurrentNote());
    }
    if (this.preview) {
      section.createDiv({ cls: 'privacy-bridge-review-summary' }, (summary) => {
        summary.createEl('strong', { text: `審核完成：${this.previewChanges.length} 項` });
        const revise = summary.createEl('button', {
          text: '返回修改審核',
          attr: { 'aria-label': '返回候選審核' },
        });
        revise.addEventListener('click', () => {
          this.clearPreview();
          this.statusMessage = '可修改候選處理方式，再重新建立預覽。';
          this.render();
        });
      });
      section.createEl('h3', { text: '轉換前後對照' });
      section.createDiv({ cls: 'privacy-bridge-change-list' }, (list) =>
        this.previewChanges.forEach((change) =>
          list.createDiv({ cls: 'privacy-bridge-change-card' }, (card) => {
            card.createEl('h4', {
              text: `${change.type}${change.decision === 'IGNORED' ? '（保留原文）' : ''}`,
            });
            card.createDiv({ cls: 'privacy-bridge-change-box privacy-bridge-before' }, (box) => {
              box.createEl('span', { cls: 'privacy-bridge-change-label', text: '轉換前' });
              box.createEl('code', { text: change.before });
            });
            card.createEl('div', {
              cls: 'privacy-bridge-change-arrow',
              text: '↓',
              attr: { 'aria-hidden': 'true' },
            });
            card.createDiv({ cls: 'privacy-bridge-change-box privacy-bridge-after' }, (box) => {
              box.createEl('span', { cls: 'privacy-bridge-change-label', text: '轉換後' });
              box.createEl('code', { text: change.after });
            });
          }),
        ),
      );
      section.createEl('h3', { text: '完整文件' });
      section.createDiv({ cls: 'privacy-bridge-preview-switch' }, (controls) => {
        const before = controls.createEl('button', {
          text: '查看完整原文',
          attr: {
            'aria-pressed': String(this.previewMode === 'BEFORE'),
            'aria-label': '查看完整轉換前原文',
          },
        });
        before.addEventListener('click', () => {
          this.previewMode = 'BEFORE';
          this.render();
        });
        const after = controls.createEl('button', {
          text: '查看完整轉換後',
          attr: {
            'aria-pressed': String(this.previewMode === 'AFTER'),
            'aria-label': '查看完整去識別化結果',
          },
        });
        after.addEventListener('click', () => {
          this.previewMode = 'AFTER';
          this.render();
        });
      });
      section.createEl('pre', {
        cls: 'privacy-bridge-preview',
        text: this.previewMode === 'BEFORE' ? (this.previewSource ?? '') : this.preview,
        attr: {
          'aria-label':
            this.previewMode === 'BEFORE' ? '完整轉換前 Markdown' : '完整去識別化 Markdown',
        },
      });
    }
    const button = section.createEl('button', {
      text: '建立去識別化輸出',
      attr: { 'aria-label': 'Privacy Bridge: create sanitized output' },
    });
    button.disabled =
      this.clientState === 'LOCKED' ||
      !this.preview ||
      pending > 0 ||
      hasBlocked ||
      reasons.length > 0;
    button.addEventListener('click', () => void this.actions.exportCurrentNote());
    if (button.disabled) {
      const allReasons =
        this.clientState === 'LOCKED'
          ? ['請先掃描目前文件。', ...reasons]
          : this.candidates.length === 0
            ? ['目前文件沒有可輸出的候選項目。', ...reasons]
            : pending > 0
              ? [`仍有 ${pending} 個未審核候選`, ...reasons]
              : hasBlocked
                ? ['偵測到禁止輸出的敏感內容。', ...reasons]
                : !this.preview
                  ? ['請先建立轉換預覽。', ...reasons]
                  : reasons;
      section.createEl('ul', { attr: { 'aria-label': '匯出不可用原因' } }, (list) =>
        allReasons.forEach((reason) => list.createEl('li', { text: reason })),
      );
    }
    if (this.outputFile)
      section.createDiv({ cls: 'privacy-bridge-output' }, (output) => {
        output.createEl('p', {
          cls: 'privacy-bridge-output-path',
          text: `輸出檔：${this.outputFile}`,
        });
        const reveal = output.createEl('button', {
          text: '在 Finder 顯示輸出檔',
          attr: { 'aria-label': '在 Finder 顯示去識別化輸出檔' },
        });
        reveal.addEventListener(
          'click',
          () => void this.actions.revealOutputFile(this.outputFile!),
        );
      });
  }
}
