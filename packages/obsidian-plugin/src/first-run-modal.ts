import { Modal, type App } from 'obsidian';
import {
  AGENT_LOCAL_PROMPT,
  DICTIONARY_ONLY_LABELS,
  EXTERNAL_AI_PROMPT,
  FILE_FORMAT_SUPPORT,
  MODEL_POLICY,
  SUPPORT_GROUPS,
  SUPPORT_LIMITATIONS,
  type NoviceSettings,
} from './novice-support.js';

interface FirstRunActions {
  acceptSecurityNotice(): Promise<void>;
  completeOnboarding(): Promise<void>;
  createNoviceDemo(): Promise<void>;
  useOwnMarkdown(): Promise<void>;
  disableLocalModel(): Promise<void>;
}

export class PrivacyBridgeFirstRunModal extends Modal {
  private step: 0 | 1 | 2 | 3;

  constructor(
    app: App,
    settings: NoviceSettings,
    private readonly actions: FirstRunActions,
  ) {
    super(app);
    this.step = settings.securityNoticeAccepted ? 1 : 0;
  }

  override onOpen(): void {
    this.modalEl.classList.add('privacy-bridge-first-run-modal');
    this.render();
  }

  override onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    this.contentEl.empty();
    const article = this.contentEl.createEl('article', { cls: 'privacy-bridge-first-run' });
    article.createEl('p', {
      cls: 'privacy-bridge-onboarding-progress',
      text: `首次設定 ${this.step + 1} / 4`,
      attr: { 'aria-live': 'polite' },
    });
    if (this.step === 0) this.renderSecurity(article);
    if (this.step === 1) this.renderSupport(article);
    if (this.step === 2) this.renderModelPolicy(article);
    if (this.step === 3) this.renderPractice(article);
  }

  private createStepTitle(article: HTMLElement, text: string): HTMLHeadingElement {
    const title = article.createEl('h2', { text, attr: { tabindex: '-1' } });
    queueMicrotask(() => title.focus());
    return title;
  }

  private renderSecurity(article: HTMLElement): void {
    this.createStepTitle(article, '先了解 Hans SafeDoc 的安全邊界');
    article.createEl('p', {
      text: 'Hans SafeDoc 會用安全代碼暫時代替敏感資料，未來可透過正式功能換回，這稱為可逆假名化。它不是完全匿名化。第一次使用前，請確認以下限制。',
    });
    article.createEl('ul', {}, (list) => {
      for (const item of [
        '自動偵測不能保證找出所有敏感資料，輸出前仍需人工檢查。',
        '其他 Obsidian 外掛可能讀取同一個 Obsidian 資料庫。',
        '正式資料建議使用專用的 Obsidian 資料庫與使用者設定檔，只啟用允許的外掛，並關閉 Obsidian 同步功能。',
        '外掛不會上傳文件內容或使用情況；正式版也不提供模型下載或匯入。',
        '安全代碼化輸出建立在 Obsidian 資料庫外，來源 MD／TXT／CSV／DOCX／XLSX 不會被修改。',
        '建立輸出時必須設定至少 12 個字元的還原密碼；密碼不會儲存，遺失後 Hans SafeDoc 無法替你找回。',
      ])
        list.createEl('li', { text: item });
    });
    const label = article.createEl('label', { cls: 'privacy-bridge-consent' });
    const checkbox = label.createEl('input', {
      attr: { type: 'checkbox', 'aria-label': '我理解以上限制' },
    });
    label.createSpan({ text: '我理解以上限制' });
    const continueButton = article.createEl('button', {
      text: '繼續',
      cls: 'mod-cta',
      attr: { disabled: 'true' },
    });
    checkbox.addEventListener('change', () => {
      continueButton.disabled = !checkbox.checked;
    });
    continueButton.addEventListener('click', () => {
      if (!checkbox.checked) return;
      continueButton.disabled = true;
      void this.actions.acceptSecurityNotice().then(() => {
        this.step = 1;
        this.render();
      });
    });
  }

  private renderSupport(article: HTMLElement): void {
    this.createStepTitle(article, '目前 Hans SafeDoc v1.4 可用');
    article.createEl('p', {
      text: '請從「選擇檔案」進入。來源保持唯讀，所有偵測項目都必須人工確認；只有格式 adapter 改寫、重新開啟與殘留檢查全部通過後，才會顯示安全副本。',
    });
    const grid = article.createDiv({ cls: 'privacy-bridge-support-grid' });
    for (const group of SUPPORT_GROUPS) {
      const card = grid.createDiv({ cls: 'privacy-bridge-support-card' });
      card.createEl('h3', { text: group.title });
      card.createEl('p', { text: group.items });
    }
    article.createEl('h3', { text: '偵測限制' });
    article.createEl('ul', {}, (list) => {
      for (const limitation of SUPPORT_LIMITATIONS) list.createEl('li', { text: limitation });
    });
    article.createEl('h3', { text: '工作階段客戶字典' });
    article.createEl('p', {
      text: `${DICTIONARY_ONLY_LABELS.join('、')}可由 JSON、CSV 或逐行貼上建立的客戶字典精確比對。字典不寫入 Obsidian 資料庫或外掛設定，鎖定或關閉後會清除；仍須人工確認每個結果。`,
    });
    article.createEl('h3', { text: '地址隱私層級' });
    article.createEl('p', {
      text: '臺灣地址預設完整保護；需要區域分析時可明確選擇保留縣市或行政區。無法安全拆分時會自動回到完整保護，保留越多地理資訊，重新識別風險越高。',
    });
    article.createEl('h3', { text: '檔案格式（同一份中央矩陣）' });
    article.createEl('ul', {}, (list) => {
      for (const format of FILE_FORMAT_SUPPORT)
        list.createEl('li', {
          text: `${format.label}：${
            format.mode === 'SUPPORTED_READ_ONLY'
              ? '支援（來源唯讀）'
              : format.mode === 'LOCAL_AGENT_TO_MD_ONLY'
                ? '只提供本機 Agent 轉 MD 路徑'
                : '阻擋'
          }。${format.guidance}`,
        });
    });
    article.createEl('h3', { text: '可複製指令' });
    article.createEl('pre', { text: `A：${AGENT_LOCAL_PROMPT}\nB：${EXTERNAL_AI_PROMPT}` });
    article.createEl('h3', { text: '其他尚未開放的流程' });
    article.createEl('p', {
      text: '不支援 Obsidian 手機版或掃描整個 Obsidian 資料庫。安全還原只接受符合 result-package.schema.json 的單一 UTF-8 JSON，不接受 Markdown、Office、PDF 或其他格式。',
    });
    this.renderNavigation(article, 0, 2, '下一步：模型說明');
  }

  private renderModelPolicy(article: HTMLElement): void {
    this.createStepTitle(article, '正式版不提供模型安裝');
    article.createEl('p', { text: MODEL_POLICY.summary });
    article.createEl('p', {
      text: '固定規則可處理目前支援的 MD、TXT、CSV、DOCX 與 XLSX 安全子集。系統不會下載模型，也不會讀取既有模型檔；需要人名、組織或內部專有詞時，可另行匯入工作階段客戶字典，輸出前仍必須人工檢查。',
    });
    const actions = article.createDiv({ cls: 'privacy-bridge-onboarding-actions' });
    const status = actions.createSpan({
      cls: 'privacy-bridge-copy-status',
      attr: { 'aria-live': 'polite' },
    });
    const fixedRules = actions.createEl('button', {
      text: '繼續使用固定規則',
      cls: 'mod-cta',
    });
    fixedRules.addEventListener('click', () => {
      fixedRules.disabled = true;
      status.textContent = '正在儲存固定規則設定…';
      void this.actions.disableLocalModel().then(() => {
        this.step = 3;
        this.render();
      });
    });
    const back = article.createEl('button', { text: '上一步' });
    back.addEventListener('click', () => {
      this.step = 1;
      this.render();
    });
  }

  private renderPractice(article: HTMLElement): void {
    this.createStepTitle(article, '先用合成資料完整練習一次');

    article.createEl('p', {
      text: '建議先建立一篇明確標示的合成練習筆記。Hans SafeDoc 只會在你按下按鈕後建立，不會在安裝時自動寫入 Obsidian 資料庫。',
    });
    article.createEl('ol', {}, (list) => {
      for (const item of [
        '建立並開啟安全練習筆記。',
        '掃描分散在段落、清單、引用和表格中的 10 支假手機與 10 個測試用電子郵件。',
        '在右側逐項審核或批次確認。',
        '比較原始內容與安全代碼化內容。',
        '設定本次 Job 的還原密碼，建立 Obsidian 資料庫外的輸出，確認來源筆記保持不變。',
      ])
        list.createEl('li', { text: item });
    });
    const actions = article.createDiv({ cls: 'privacy-bridge-onboarding-actions' });
    const demo = actions.createEl('button', {
      text: '建立安全練習筆記並開始',
      cls: 'mod-cta',
    });
    const status = actions.createSpan({
      cls: 'privacy-bridge-copy-status',
      attr: { 'aria-live': 'polite' },
    });
    demo.addEventListener('click', () => {
      demo.disabled = true;
      void this.actions
        .createNoviceDemo()
        .then(() => this.actions.completeOnboarding())
        .then(() => this.close())
        .catch(() => {
          demo.disabled = false;
          status.textContent = '無法建立練習筆記，請確認 Obsidian 資料庫可寫入後重試。';
        });
    });
    const own = actions.createEl('button', { text: '改用自己的 MD 筆記' });
    own.addEventListener('click', () => {
      void this.actions.useOwnMarkdown().then(() => this.close());
    });
    const later = actions.createEl('button', { text: '稍後再做' });
    later.addEventListener('click', () => this.close());
    const back = article.createEl('button', { text: '上一步' });
    back.addEventListener('click', () => {
      this.step = 2;
      this.render();
    });
  }

  private renderNavigation(
    article: HTMLElement,
    previous: 0 | 1 | 2,
    next: 1 | 2 | 3,
    nextLabel: string,
  ): void {
    const navigation = article.createDiv({ cls: 'privacy-bridge-onboarding-actions' });
    const back = navigation.createEl('button', { text: '上一步' });
    back.addEventListener('click', () => {
      this.step = previous;
      this.render();
    });
    const forward = navigation.createEl('button', { text: nextLabel, cls: 'mod-cta' });
    forward.addEventListener('click', () => {
      this.step = next;
      this.render();
    });
  }
}
