import { Modal, type App } from 'obsidian';
import { DICTIONARY_LIMITS, type Dictionary } from '@privacy-bridge/core';
import {
  dictionaryFromCsv,
  dictionaryFromLines,
  dictionaryPreviewWarnings,
  validateImportedDictionaryBytes,
  WIZARD_DICTIONARY_TYPES,
  type WizardDictionaryType,
} from './dictionary-import.js';
import { displayTypeName } from './workflow.js';

export class DictionaryImportModal extends Modal {
  private settled = false;

  constructor(
    app: App,
    private readonly finish: (dictionary: Dictionary | undefined) => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.renderStart();
  }

  private renderStart(statusMessage = ''): void {
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: '建立工作階段客戶字典' });
    this.contentEl.createEl('p', {
      text: '字典只留在目前工作階段的記憶體，不會寫入 Vault、外掛設定或 Safe Package。載入後必須重新掃描文件。',
    });
    if (statusMessage)
      this.contentEl.createEl('p', {
        text: statusMessage,
        attr: { role: 'alert', 'aria-live': 'assertive' },
      });

    this.contentEl.createEl('h3', { text: '從 JSON 或 CSV 匯入' });
    this.contentEl.createEl('p', {
      text: 'CSV 必須包含 term、type 欄位，可選 aliases 與 caseSensitive；多個 Alias 請用 | 分隔。',
    });
    const file = this.contentEl.createEl('input', {
      type: 'file',
      attr: { accept: '.json,.csv,application/json,text/csv' },
    });
    file.addEventListener('change', () => void this.readFile(file.files?.[0]));

    this.contentEl.createEl('h3', { text: '直接貼上名稱' });
    const typeLabel = this.contentEl.createEl('label', { text: '資料類型' });
    const type = typeLabel.createEl('select', { attr: { 'aria-label': '客戶字典資料類型' } });
    for (const value of WIZARD_DICTIONARY_TYPES)
      type.createEl('option', { value, text: displayTypeName(value) });
    const linesLabel = this.contentEl.createEl('label', { text: '每行一個名稱' });
    const lines = linesLabel.createEl('textarea', {
      attr: { rows: 8, spellcheck: 'false', 'aria-label': '每行一個客戶字典名稱' },
      placeholder: '王小明\n陳美玲\n林志豪',
    });
    const preview = this.contentEl.createEl('button', {
      text: '預覽貼上內容',
      cls: 'mod-cta',
    });
    preview.addEventListener('click', () => {
      const parsed = dictionaryFromLines(lines.value, type.value as WizardDictionaryType);
      if (!parsed.ok) this.renderStart(`無法建立字典：${parsed.error.code}`);
      else this.renderPreview(parsed.value, '貼上內容');
    });
    const cancel = this.contentEl.createEl('button', { text: '取消' });
    cancel.addEventListener('click', () => this.close());
  }

  private async readFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (file.size > DICTIONARY_LIMITS.bytes) {
      this.renderStart('字典超過 25 MB，未讀取檔案。');
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = file.name.toLowerCase().endsWith('.csv')
      ? dictionaryFromCsv(bytes)
      : validateImportedDictionaryBytes(bytes);
    if (!parsed.ok) {
      this.renderStart(`字典格式或安全限制驗證失敗：${parsed.error.code}`);
      return;
    }
    this.renderPreview(parsed.value, file.name);
  }

  private renderPreview(dictionary: Dictionary, source: string): void {
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: '確認客戶字典' });
    this.contentEl.createEl('p', {
      text: `${source} · ${dictionary.entries.length} 筆，載入後會清除目前審核狀態並要求重新掃描。`,
    });
    const warnings = dictionaryPreviewWarnings(dictionary);
    if (warnings.length)
      this.contentEl.createEl('ul', { attr: { 'aria-label': '字典提醒' } }, (list) =>
        warnings.forEach((warning) => list.createEl('li', { text: warning })),
      );
    this.contentEl.createEl('ul', { attr: { 'aria-label': '字典預覽' } }, (list) =>
      dictionary.entries.slice(0, 8).forEach((entry) =>
        list.createEl('li', {
          text: `${displayTypeName(entry.type)}：${entry.term}${entry.aliases?.length ? `（Alias：${entry.aliases.join('、')}）` : ''}`,
        }),
      ),
    );
    if (dictionary.entries.length > 8)
      this.contentEl.createEl('p', { text: `另外還有 ${dictionary.entries.length - 8} 筆。` });
    const back = this.contentEl.createEl('button', { text: '返回修改' });
    back.addEventListener('click', () => this.renderStart());
    const confirm = this.contentEl.createEl('button', {
      text: '確認載入並重新掃描',
      cls: 'mod-cta',
    });
    confirm.addEventListener('click', () => {
      this.settled = true;
      this.finish(dictionary);
      this.close();
    });
  }

  override onClose(): void {
    this.contentEl.empty();
    if (!this.settled) this.finish(undefined);
  }
}
