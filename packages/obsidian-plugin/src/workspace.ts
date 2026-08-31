import { ItemView, type WorkspaceLeaf } from 'obsidian';
import {
  clearSensitiveUiState,
  disabledReasons,
  type ClientUiState,
  type WorkflowBlockers,
} from './ui-state.js';
import type { DetectedCandidate } from '@privacy-bridge/core';
import {
  displayTypeName,
  type CandidateDecision,
  type PreviewChange,
  type PreviewHunk,
} from './workflow.js';
import type {
  ExternalMandatoryReviewRecord,
  ExternalReviewDocument,
} from './external-format-workflow.js';

export const PRIVACY_BRIDGE_VIEW = 'privacy-bridge-workspace';

function displaySourceName(path: string | undefined): string {
  return path?.split(/[\\/]/u).at(-1) || '目前文件';
}

export interface PrivacyBridgeWorkspaceActions {
  chooseFile(): Promise<void>;
  scanCurrentNote(): Promise<void>;
  reviewCandidate(candidateId: string, decision: CandidateDecision): Promise<void>;
  acknowledgeMandatoryReview(recordId: string): Promise<void>;
  reviewAllCandidates(): Promise<void>;
  previewCurrentNote(): Promise<void>;
  exportCurrentNote(): Promise<void>;
  revealOutputFile(path: string): Promise<void>;
  openOutputFile(path: string): Promise<void>;
  openSafeOutputPreview(): Promise<void>;
  openDiffPreview(): Promise<void>;
  openTutorial(): Promise<void>;
}

/** The view owns only display state. Keys and raw values stay in the secure workflow layer. */
export class PrivacyBridgeWorkspaceView extends ItemView {
  private clientState: ClientUiState = 'LOCKED';
  private blockers: WorkflowBlockers = {};
  private sensitive = clearSensitiveUiState();
  private sourcePath: string | undefined;
  private sourceKind: ExternalReviewDocument['kind'] | undefined;
  private candidates: readonly DetectedCandidate[] = [];
  private candidateLocations = new Map<string, string>();
  private decisions = new Map<string, CandidateDecision>();
  private mandatoryReviewRecords: readonly ExternalMandatoryReviewRecord[] = [];
  private mandatoryReviewIds = new Set<string>();
  private preview: string | undefined;
  private previewSource: string | undefined;
  private previewChanges: readonly PreviewChange[] = [];
  private previewHunks: readonly PreviewHunk[] = [];

  private activeHunkIndex = 0;
  private selectedType = 'ALL';
  private expandedGaps = new Map<string, 'CONTEXT' | 'ALL'>();
  private hunkObserver: IntersectionObserver | undefined;
  private outputFile: string | undefined;
  private statusMessage: string | undefined;
  private errorMessage: string | undefined;
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
    return 'Hans SafeDoc';
  }
  override getIcon(): string {
    return 'shield-check';
  }
  setClientState(state: ClientUiState): void {
    this.clientState = state;
    if (state === 'LOCKED') {
      this.sensitive = clearSensitiveUiState();
      this.sourcePath = undefined;
      this.sourceKind = undefined;
      this.candidates = [];
      this.candidateLocations.clear();
      this.decisions.clear();
      this.mandatoryReviewRecords = [];
      this.mandatoryReviewIds.clear();
      this.clearPreview();
      this.outputFile = undefined;
      this.errorMessage = undefined;
    }
    this.render();
  }
  resetSelection(): void {
    this.clientState = 'LOCKED';
    this.blockers = {};
    this.sensitive = clearSensitiveUiState();
    this.sourcePath = undefined;
    this.sourceKind = undefined;
    this.candidates = [];
    this.candidateLocations.clear();
    this.decisions.clear();
    this.mandatoryReviewRecords = [];
    this.mandatoryReviewIds.clear();
    this.clearPreview();
    this.outputFile = undefined;
    this.statusMessage = undefined;
    this.errorMessage = undefined;
    this.batchConfirmation = false;
    this.render();
  }
  setScanResult(
    sourcePath: string,
    candidates: readonly DetectedCandidate[],
    mandatoryReviewRecords: readonly ExternalMandatoryReviewRecord[] = [],
    sourceKind?: ExternalReviewDocument['kind'],
    candidateLocations: ReadonlyMap<string, string> = new Map(),
  ): void {
    this.clientState = 'UNLOCKED';
    this.sourcePath = sourcePath;
    this.sourceKind = sourceKind;
    this.candidates = candidates;
    this.candidateLocations = new Map(candidateLocations);
    this.decisions.clear();
    this.mandatoryReviewRecords = [
      ...new Map(mandatoryReviewRecords.map((record) => [record.id, record])).values(),
    ];
    this.mandatoryReviewIds.clear();
    this.clearPreview();
    this.outputFile = undefined;
    this.statusMessage = `找到 ${candidates.length} 個敏感項目與 ${this.mandatoryReviewRecords.length} 個強制人工確認項目。`;
    this.errorMessage = undefined;
    this.render();
  }
  setReviewDecision(candidateId: string, decision: CandidateDecision): void {
    this.decisions.set(candidateId, decision);
    this.clearPreview();
    this.outputFile = undefined;
    const pending = this.candidates.filter(
      (candidate) =>
        candidate.handling !== 'BLOCK_EXPORT' && !this.decisions.has(candidate.candidateId),
    ).length;
    this.statusMessage =
      pending === 0 ? '所有項目都已確認，可以建立預覽。' : `還有 ${pending} 個項目尚未確認。`;
    this.render();
  }
  setMandatoryReviewAcknowledged(recordId: string): void {
    if (!this.mandatoryReviewRecords.some((record) => record.id === recordId)) return;
    this.mandatoryReviewIds.add(recordId);
    this.clearPreview();
    this.outputFile = undefined;
    const pending = this.mandatoryReviewRecords.length - this.mandatoryReviewIds.size;
    this.statusMessage =
      pending === 0
        ? '所有強制人工確認項目都已逐項確認。'
        : `還有 ${pending} 個強制人工確認項目尚未確認。`;
    this.render();
  }
  setAllReviewDecisions(candidateIds: readonly string[]): void {
    for (const candidateId of candidateIds) this.decisions.set(candidateId, 'ACCEPTED');
    this.batchConfirmation = false;
    this.clearPreview();
    this.outputFile = undefined;
    this.statusMessage = '所有可處理項目都已接受，正在建立預覽。';
    this.render();
  }
  setPreview(
    source: string,
    preview: string,
    changes: readonly PreviewChange[],
    hunks: readonly PreviewHunk[],
  ): void {
    this.previewSource = source;
    this.preview = preview;
    this.previewChanges = changes;
    this.previewHunks = hunks;
    this.activeHunkIndex = 0;
    this.outputFile = undefined;
    this.statusMessage = '預覽已建立，確認後可輸出到 Obsidian 資料庫外。';
    this.render();
  }
  setOutputResult(outputFile: string): void {
    this.outputFile = outputFile;
    this.statusMessage = '安全代碼化輸出已完成，來源文件未修改。';
    this.errorMessage = undefined;
    this.render();
  }
  setError(message: string): void {
    this.statusMessage = undefined;
    this.errorMessage = message;
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
    this.hunkObserver?.disconnect();
    this.sensitive = clearSensitiveUiState();
    this.sourceKind = undefined;
    this.candidateLocations.clear();
    this.decisions.clear();
    this.mandatoryReviewIds.clear();
    this.clearPreview();
  }
  private clearPreview(): void {
    this.preview = undefined;
    this.previewSource = undefined;
    this.previewChanges = [];
    this.previewHunks = [];
    this.activeHunkIndex = 0;
    this.selectedType = 'ALL';
    this.expandedGaps.clear();
  }

  private moveToHunk(index: number): void {
    const hunks = this.filteredHunks();
    this.activeHunkIndex = Math.max(0, Math.min(index, hunks.length - 1));
    this.render();
    queueMicrotask(() => {
      const target = this.containerEl.querySelector<HTMLElement>(
        `#privacy-bridge-hunk-${this.activeHunkIndex}`,
      );
      target?.scrollIntoView({ block: 'center' });
      target?.focus({ preventScroll: true });
    });
  }
  private filteredHunks(): readonly PreviewHunk[] {
    return this.selectedType === 'ALL'
      ? this.previewHunks
      : this.previewHunks.filter((hunk) => hunk.types.includes(this.selectedType));
  }
  private renderReviewSummary(section: HTMLElement): void {
    const accepted = this.previewChanges.filter((change) => change.decision === 'ACCEPTED');
    const ignored = this.previewChanges.length - accepted.length;
    const typeCounts = new Map<string, number>();
    for (const change of accepted)
      typeCounts.set(change.type, (typeCounts.get(change.type) ?? 0) + 1);
    section.createDiv({ cls: 'privacy-bridge-review-overview' }, (overview) => {
      overview.createEl('strong', {
        text: `${this.previewHunks.length} 處變更 · ${accepted.length} 個敏感項目`,
      });
      overview.createEl('p', {
        text: `已轉換 ${accepted.length} · 保留原文 ${ignored} · 需要人工確認 0`,
      });
      overview.createEl(
        'div',
        {
          cls: 'privacy-bridge-type-filter',
          attr: { role: 'group', 'aria-label': '依資料類型篩選變更' },
        },
        (filters) => {
          const options: readonly [string, string, number][] = [
            ['ALL', '全部', accepted.length],
            ...[...typeCounts.entries()].map(
              ([type, count]) => [type, displayTypeName(type), count] as [string, string, number],
            ),
          ];
          for (const [type, label, count] of options) {
            const button = filters.createEl('button', {
              text: `${label} ${count}`,
              attr: { 'aria-pressed': String(this.selectedType === type) },
            });
            button.addEventListener('click', () => {
              this.selectedType = type;
              this.activeHunkIndex = 0;
              this.expandedGaps.clear();
              this.render();
            });
          }
        },
      );
    });
  }
  private renderCollapsedGap(
    parent: HTMLElement,
    key: string,
    lines: readonly string[],
    noun: string,
  ): void {
    if (lines.length === 0) return;
    const state = this.expandedGaps.get(key);
    parent.createDiv({ cls: 'privacy-bridge-collapsed-lines' }, (gap) => {
      gap.createEl('span', { text: `已收合 ${lines.length} 行${noun}` });
      if (state) {
        const visible =
          state === 'ALL' || lines.length <= 6
            ? lines
            : [...lines.slice(0, 3), '⋯', ...lines.slice(-3)];
        gap.createEl('pre', { text: visible.join('\n') });
        const collapse = gap.createEl('button', { text: '重新收合' });
        collapse.addEventListener('click', () => {
          this.expandedGaps.delete(key);
          this.render();
        });
      } else {
        const context = gap.createEl('button', { text: '顯示前後 3 行' });
        context.addEventListener('click', () => {
          this.expandedGaps.set(key, 'CONTEXT');
          this.render();
        });
        const all = gap.createEl('button', { text: '展開這一段' });
        all.addEventListener('click', () => {
          this.expandedGaps.set(key, 'ALL');
          this.render();
        });
      }
    });
  }
  private observeVisibleHunks(total: number): void {
    if (typeof IntersectionObserver === 'undefined' || total === 0) return;
    queueMicrotask(() => {
      const elements = [
        ...this.containerEl.querySelectorAll<HTMLElement>('.privacy-bridge-diff-hunk'),
      ];
      const root = elements[0]?.closest('.view-content');
      this.hunkObserver = new IntersectionObserver(
        () => {
          const rootRect = root?.getBoundingClientRect();
          const viewportCenter = rootRect
            ? (rootRect.top + rootRect.bottom) / 2
            : window.innerHeight / 2;
          const visible = elements
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return (
                rect.bottom > (rootRect?.top ?? 0) && rect.top < (rootRect?.bottom ?? innerHeight)
              );
            })
            .sort((left, right) => {
              const leftRect = left.getBoundingClientRect();
              const rightRect = right.getBoundingClientRect();
              return (
                Math.abs((leftRect.top + leftRect.bottom) / 2 - viewportCenter) -
                Math.abs((rightRect.top + rightRect.bottom) / 2 - viewportCenter)
              );
            })[0];
          const index = Number(visible?.dataset.hunkIndex);
          if (!Number.isInteger(index) || index === this.activeHunkIndex) return;
          this.activeHunkIndex = index;
          const position = this.containerEl.querySelector('.privacy-bridge-preview-position');
          if (position) position.textContent = `第 ${index + 1} / ${total} 處`;
          for (const [itemIndex, element] of elements.entries())
            element.classList.toggle('is-active', itemIndex === index);
        },
        { root: root ?? null, threshold: [0.35, 0.6] },
      );
      for (const element of elements) this.hunkObserver.observe(element);
    });
  }
  private renderPreview(section: HTMLElement): void {
    const hunks = this.filteredHunks();
    this.activeHunkIndex = Math.max(0, Math.min(this.activeHunkIndex, hunks.length - 1));
    section.createDiv({ cls: 'privacy-bridge-preview-toolbar' }, (toolbar) => {
      toolbar.createDiv({ cls: 'privacy-bridge-preview-tabs' }, (tabs) => {
        const changes = tabs.createEl('button', {
          text: '只看變更',
          attr: { 'aria-pressed': 'true', 'aria-label': '目前顯示變更位置前後內容' },
        });
        changes.disabled = true;
        const compare = tabs.createEl('button', { text: '開啟完整比較' });
        compare.addEventListener('click', () => void this.actions.openDiffPreview());
      });
      toolbar.createDiv({ cls: 'privacy-bridge-preview-navigation' }, (navigation) => {
        const previous = navigation.createEl('button', {
          text: '上一處',
          attr: { 'aria-keyshortcuts': 'Alt+ArrowLeft' },
        });
        previous.disabled = this.activeHunkIndex === 0;
        previous.addEventListener('click', () => this.moveToHunk(this.activeHunkIndex - 1));
        navigation.createEl('span', {
          cls: 'privacy-bridge-preview-position',
          text:
            hunks.length === 0 ? '沒有變更' : `第 ${this.activeHunkIndex + 1} / ${hunks.length} 處`,
          attr: { 'aria-live': 'polite' },
        });
        const next = navigation.createEl('button', {
          text: '下一處',
          attr: { 'aria-keyshortcuts': 'Alt+ArrowRight' },
        });
        next.disabled = this.activeHunkIndex >= hunks.length - 1;
        next.addEventListener('click', () => this.moveToHunk(this.activeHunkIndex + 1));
        const revise = navigation.createEl('button', { text: '返回修改審核' });
        revise.addEventListener('click', () => {
          this.clearPreview();
          this.statusMessage = '可修改每個項目的處理方式，再重新建立預覽。';
          this.render();
        });
      });
    });
    this.renderReviewSummary(section);
    {
      section.createDiv({ cls: 'privacy-bridge-unified-diff' }, (diff) => {
        const sourceLines = (this.previewSource ?? '').split(/\r?\n/u);
        let previousLine = 0;
        hunks.forEach((hunk, index) => {
          const gapLines = sourceLines.slice(previousLine, hunk.lineNumber - 1);
          this.renderCollapsedGap(
            diff,
            `${this.selectedType}:${previousLine}:${hunk.lineNumber}`,
            gapLines,
            this.selectedType === 'ALL' ? '未變更內容' : '其他內容',
          );
          diff.createEl(
            'article',
            {
              cls: `privacy-bridge-diff-hunk${index === this.activeHunkIndex ? ' is-active' : ''}`,
              attr: {
                id: `privacy-bridge-hunk-${index}`,
                tabindex: '-1',
                'data-hunk-index': String(index),
                'aria-label': `第 ${index + 1} / ${hunks.length} 處變更，${hunk.types
                  .map(displayTypeName)
                  .join('、')}`,
              },
            },
            (article) => {
              article.createEl('h4', {
                text: `第 ${hunk.lineNumber} 行 · ${hunk.types.map(displayTypeName).join(' · ')}`,
              });
              article.createDiv({ cls: 'privacy-bridge-diff-before' }, (row) => {
                row.createEl('span', { text: '− 原始' });
                row.createEl('code', { text: hunk.beforeLine });
              });
              article.createDiv({ cls: 'privacy-bridge-diff-after' }, (row) => {
                row.createEl('span', { text: '+ 轉換後' });
                row.createEl('code', { text: hunk.displayAfterLine });
                row.createEl('details', { cls: 'privacy-bridge-token-details' }, (details) => {
                  details.createEl('summary', { text: '查看完整代碼' });
                  details.createEl('code', { text: hunk.afterLine });
                });
              });
            },
          );
          previousLine = hunk.lineNumber;
        });
        this.renderCollapsedGap(
          diff,
          `${this.selectedType}:${previousLine}:end`,
          sourceLines.slice(previousLine),
          this.selectedType === 'ALL' ? '未變更內容' : '其他內容',
        );
      });
      this.observeVisibleHunks(hunks.length);
    }
  }
  private renderOfficeFidelityBoundary(section: HTMLElement, pendingMandatory: number): void {
    if (this.sourceKind !== 'docx' && this.sourceKind !== 'xlsx') return;
    section.createEl(
      'aside',
      {
        cls: 'privacy-bridge-office-boundary',
        attr: { 'aria-label': 'Office 預覽與保留範圍' },
      },
      (boundary) => {
        boundary.createEl('strong', { text: 'Office 預覽限制' });
        boundary.createEl('p', {
          text: '這裡只預覽文字安全代碼化結果，不模擬 Word／Excel 版面。未改寫的版面、樣式、圖片與已逐項確認內容會原樣保留；輸出後請用原生程式再開啟確認。',
        });
        boundary.createEl('p', {
          text: `尚待強制人工確認：${pendingMandatory} 項。`,
          attr: { 'aria-live': 'polite' },
        });
        const locations = [...new Set(this.candidateLocations.values())];
        if (locations.length > 0)
          boundary.createEl('ul', { attr: { 'aria-label': 'Office 敏感資料位置' } }, (list) =>
            locations.forEach((location) => list.createEl('li', { text: location })),
          );
      },
    );
  }
  private renderOutputResult(section: HTMLElement): void {
    if (!this.outputFile) return;
    section.createDiv({ cls: 'privacy-bridge-output' }, (output) => {
      output.createEl('h3', { text: '完成：安全檔案已建立' });
      output.createEl('p', {
        cls: 'privacy-bridge-output-status',
        text: '來源文件未修改。你現在可以先預覽安全檔案，或直接找到輸出位置。',
      });
      output.createDiv({ cls: 'privacy-bridge-output-actions' }, (actions) => {
        const another = actions.createEl('button', {
          text: '處理另一份檔案',
          cls: 'mod-cta',
        });
        another.addEventListener('click', () => void this.actions.chooseFile());
        const preview = actions.createEl('button', {
          text: '開啟安全預覽',
        });
        preview.addEventListener('click', () => void this.actions.openSafeOutputPreview());
        const nativeOpen = actions.createEl('button', {
          text: '用預設程式開啟安全檔案',
          attr: { 'aria-label': '用系統預設程式開啟安全代碼化輸出檔' },
        });
        nativeOpen.addEventListener(
          'click',
          () => void this.actions.openOutputFile(this.outputFile!),
        );
        const reveal = actions.createEl('button', {
          text: '顯示輸出位置',
          attr: { 'aria-label': '在檔案管理器顯示安全代碼化輸出檔' },
        });
        reveal.addEventListener(
          'click',
          () => void this.actions.revealOutputFile(this.outputFile!),
        );
      });
      output.createEl('details', { cls: 'privacy-bridge-output-details' }, (details) => {
        details.createEl('summary', { text: '查看安全檔案位置與上傳說明' });
        details.createEl('p', {
          text: '只上傳這份安全代碼化檔案，並要求其他工具完整保留所有安全代碼。',
        });
        details.createEl('p', {
          cls: 'privacy-bridge-output-path',
          text: `安全檔案：${this.outputFile}`,
        });
      });
    });
  }
  private renderCompletedDetails(section: HTMLElement): void {
    if (!this.preview) return;
    section.createEl('details', { cls: 'privacy-bridge-completed-details' }, (details) => {
      details.createEl('summary', {
        text: `查看轉換細節（${this.previewHunks.length} 處變更）`,
      });
      const body = details.createDiv({ cls: 'privacy-bridge-completed-details-body' });
      body.createEl('p', {
        cls: 'privacy-bridge-preview-meta',
        text: `${displaySourceName(this.sourcePath)} · ${this.previewHunks.length} 處變更`,
      });
      this.renderPreview(body);
    });
  }
  private renderPrimaryActions(
    section: HTMLElement,
    pendingCandidates: number,
    pendingMandatory: number,
    hasBlocked: boolean,
    reasons: readonly string[],
  ): void {
    section.createDiv({ cls: 'privacy-bridge-primary-actions' }, (actions) => {
      actions.setAttribute('role', 'toolbar');
      actions.setAttribute('aria-label', 'Hans SafeDoc 主要操作');
      if (this.candidates.length > 0 && !this.preview && pendingCandidates > 0 && !hasBlocked) {
        const acceptAll = actions.createEl('button', {
          text: `全部安全代碼化（${pendingCandidates} 項）`,
          cls: 'mod-cta',
          attr: {
            'aria-label': `批次接受 ${pendingCandidates} 個敏感項目；強制人工項目不包含在內`,
          },
        });
        acceptAll.addEventListener('click', () => {
          this.batchConfirmation = true;
          this.render();
        });
      } else if (
        (this.candidates.length > 0 || this.mandatoryReviewRecords.length > 0) &&
        !this.preview
      ) {
        const preview = actions.createEl('button', {
          text: '建立轉換預覽',
          cls: 'mod-cta',
          attr: { 'aria-label': '建立安全代碼化預覽' },
        });
        preview.disabled =
          this.clientState === 'LOCKED' ||
          pendingCandidates > 0 ||
          pendingMandatory > 0 ||
          hasBlocked;
        preview.addEventListener('click', () => void this.actions.previewCurrentNote());
      } else if (this.preview) {
        const output = actions.createEl('button', {
          text: '建立安全代碼化輸出',
          cls: 'mod-cta',
          attr: { 'aria-label': '建立安全代碼化輸出' },
        });
        output.disabled =
          this.clientState === 'LOCKED' ||
          pendingCandidates > 0 ||
          pendingMandatory > 0 ||
          hasBlocked ||
          reasons.length > 0;
        output.addEventListener('click', () => void this.actions.exportCurrentNote());
      }
      const choose = actions.createEl('button', {
        text: '選擇檔案',
        ...(this.candidates.length === 0 && !this.preview ? { cls: 'mod-cta' } : {}),
        attr: { 'aria-label': '選擇要唯讀處理的檔案' },
      });
      choose.addEventListener('click', () => void this.actions.chooseFile());
      const scan = actions.createEl('button', {
        text: '掃描目前 MD 筆記',
        attr: { 'aria-label': '掃描目前的 MD 筆記' },
      });
      scan.addEventListener('click', () => void this.actions.scanCurrentNote());
    });
    if (this.batchConfirmation) {
      section.createDiv({ cls: 'privacy-bridge-batch-confirmation' }, (confirmation) => {
        confirmation.createEl('p', {
          text: `將接受並安全代碼化 ${pendingCandidates} 個敏感項目；下方強制人工確認不會被批次接受。範例如下：`,
        });
        confirmation.createEl('ul', {}, (examples) =>
          this.candidates
            .filter(
              (candidate) =>
                candidate.handling !== 'BLOCK_EXPORT' && !this.decisions.has(candidate.candidateId),
            )
            .slice(0, 3)
            .forEach((candidate) =>
              examples.createEl('li', {
                text: `${displayTypeName(candidate.primaryType)}：${candidate.surfaceText}`,
              }),
            ),
        );
        const cancel = confirmation.createEl('button', { text: '取消' });
        cancel.addEventListener('click', () => {
          this.batchConfirmation = false;
          this.render();
        });
        const confirm = confirmation.createEl('button', {
          text: '確認全部安全代碼化',
          cls: 'mod-cta',
          attr: { 'aria-label': '確認批次安全代碼化' },
        });
        confirm.addEventListener('click', () => void this.actions.reviewAllCandidates());
        queueMicrotask(() => cancel.focus());
      });
    }
    if (this.preview && reasons.length > 0)
      section.createEl('ul', { attr: { 'aria-label': '目前無法輸出的原因' } }, (list) =>
        reasons.forEach((reason) => list.createEl('li', { text: reason })),
      );
  }
  private render(): void {
    const reasons = disabledReasons(this.blockers);
    const pendingCandidates = this.candidates.filter(
      (candidate) =>
        candidate.handling !== 'BLOCK_EXPORT' && !this.decisions.has(candidate.candidateId),
    ).length;
    const pendingMandatory = this.mandatoryReviewRecords.length - this.mandatoryReviewIds.size;
    const hasBlocked = this.candidates.some((candidate) => candidate.handling === 'BLOCK_EXPORT');
    this.hunkObserver?.disconnect();
    this.hunkObserver = undefined;
    this.containerEl.empty();
    const section = this.containerEl.createDiv({ cls: 'privacy-bridge-workspace' });
    section.addEventListener('keydown', (event) => {
      if (!this.preview || !event.altKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.moveToHunk(this.activeHunkIndex + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    section.createDiv({ cls: 'privacy-bridge-header' }, (header) => {
      header.createEl('h2', { text: 'Hans SafeDoc' });
      const tutorial = header.createEl('button', {
        text: '新手教學',
        attr: { 'aria-label': '在中央分頁開啟 Hans SafeDoc 新手教學' },
      });
      tutorial.addEventListener('click', () => void this.actions.openTutorial());
    });
    const errorMessage = this.errorMessage;
    if (errorMessage) {
      section.createDiv({ cls: 'privacy-bridge-error-card' }, (card) => {
        card.createEl('h3', { text: '這份檔案目前不能安全處理' });
        card.createEl('p', { text: errorMessage });
        card.createEl('p', { text: '原始檔沒有被修改，也沒有建立輸出。' });
        const another = card.createEl('button', {
          text: '處理另一份檔案',
          cls: 'mod-cta',
        });
        another.addEventListener('click', () => void this.actions.chooseFile());
        const help = card.createEl('button', { text: '查看支援格式與處理方式' });
        help.addEventListener('click', () => void this.actions.openTutorial());
      });
      return;
    }
    if (this.outputFile) {
      this.renderOutputResult(section);
      this.renderCompletedDetails(section);
      return;
    }
    this.renderPrimaryActions(section, pendingCandidates, pendingMandatory, hasBlocked, reasons);
    this.renderOfficeFidelityBoundary(section, pendingMandatory);
    if (!this.preview) {
      section.createEl('p', {
        text:
          this.clientState === 'LOCKED'
            ? '敏感資料工作區已鎖定，內容已遮罩。'
            : '敏感資料工作區已解鎖。',
      });
      section.createEl('p', {
        text: '來源一律唯讀；MD、TXT、CSV、DOCX、XLSX 會在逐項人工審核後建立新副本。Office 文件只接受安全結構；PDF 只提供本機 Agent 轉 MD 路徑。',
      });
      if (this.statusMessage) section.createEl('p', { text: this.statusMessage });
      if (this.sourcePath)
        section.createEl('p', { text: `來源檔案：${displaySourceName(this.sourcePath)}` });
    } else {
      section.createEl('p', {
        cls: 'privacy-bridge-preview-meta',
        text: `${displaySourceName(this.sourcePath)} · ${this.previewHunks.length} 處變更`,
      });
    }
    if (this.mandatoryReviewRecords.length > 0 && !this.preview) {
      section.createEl('h3', { text: '強制人工確認（不可批次）' });
      section.createEl('p', {
        text: '以下內容不會被自動改寫，確認後會原樣保留在副本中。請逐項確認；不確定時不要輸出。',
      });
      section.createEl(
        'ul',
        {
          cls: 'privacy-bridge-candidates privacy-bridge-mandatory-review',
          attr: { 'aria-label': '不可批次的強制人工確認項目' },
        },
        (list) =>
          this.mandatoryReviewRecords.forEach((record) => {
            list.createEl('li', { cls: 'privacy-bridge-candidate' }, (item) => {
              const acknowledged = this.mandatoryReviewIds.has(record.id);
              item.createEl('span', {
                cls: 'privacy-bridge-candidate-label',
                text: `${record.label}：${record.value}（${acknowledged ? '已確認保留' : '待逐項確認'}）`,
              });
              item.createEl('small', { text: `${record.warning} 位置：${record.location}` });
              const acknowledge = item.createEl('button', {
                text: acknowledged ? '已確認保留' : '確認保留此項',
                attr: {
                  'aria-label': `${acknowledged ? '已確認' : '確認'}保留${record.label}`,
                  'aria-pressed': String(acknowledged),
                },
              });
              acknowledge.disabled = acknowledged;
              acknowledge.addEventListener(
                'click',
                () => void this.actions.acknowledgeMandatoryReview(record.id),
              );
            });
          }),
      );
    }
    if (this.candidates.length > 0 && !this.preview) {
      section.createEl('h3', { text: '偵測結果' });
      section.createEl(
        'ul',
        { cls: 'privacy-bridge-candidates', attr: { 'aria-label': '待確認的敏感資料' } },
        (list) =>
          this.candidates.forEach((candidate) => {
            list.createEl('li', { cls: 'privacy-bridge-candidate' }, (item) => {
              const decision = this.decisions.get(candidate.candidateId);
              item.createEl('span', {
                cls: 'privacy-bridge-candidate-label',
                text: `${displayTypeName(candidate.primaryType)}：${candidate.surfaceText}（${
                  candidate.handling === 'BLOCK_EXPORT'
                    ? '禁止輸出'
                    : decision === 'ACCEPTED'
                      ? '將安全代碼化'
                      : decision === 'IGNORED'
                        ? '保留原文'
                        : '待確認'
                }）`,
              });
              if (candidate.handling !== 'BLOCK_EXPORT') {
                const accept = item.createEl('button', {
                  text: '接受並安全代碼化',
                  attr: { 'aria-label': `接受這筆${displayTypeName(candidate.primaryType)}` },
                });
                accept.addEventListener(
                  'click',
                  () => void this.actions.reviewCandidate(candidate.candidateId, 'ACCEPTED'),
                );
                const ignore = item.createEl('button', {
                  text: '忽略並保留原文',
                  attr: { 'aria-label': `保留這筆${displayTypeName(candidate.primaryType)}原文` },
                });
                ignore.addEventListener(
                  'click',
                  () => void this.actions.reviewCandidate(candidate.candidateId, 'IGNORED'),
                );
              }
            });
          }),
      );
    }
    if (this.preview) this.renderPreview(section);
  }
}
