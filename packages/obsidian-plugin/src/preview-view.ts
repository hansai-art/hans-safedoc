import { ItemView, type WorkspaceLeaf } from 'obsidian';

export const PRIVACY_BRIDGE_PREVIEW_VIEW = 'privacy-bridge-sanitized-preview';

/** Safe reading view: renders structure with text nodes only, never HTML or external resources. */
export class PrivacyBridgePreviewView extends ItemView {
  private content = '';

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }
  override getViewType(): string {
    return PRIVACY_BRIDGE_PREVIEW_VIEW;
  }
  override getDisplayText(): string {
    return '安全代碼化預覽';
  }
  override getIcon(): string {
    return 'shield-check';
  }
  setDocument(content: string): void {
    this.content = content;
    this.render();
  }
  clearSensitiveContent(): void {
    this.content = '';
    this.render();
  }
  override async onOpen(): Promise<void> {
    this.render();
  }
  private render(): void {
    this.containerEl.empty();
    const article = this.containerEl.createDiv({
      cls: 'privacy-bridge-document-preview privacy-bridge-document-sanitized',
    });
    article.createEl('h1', { text: '安全代碼化預覽' });
    article.createEl('p', {
      cls: 'privacy-bridge-preview-notice',
      text: '正式輸出仍位於 Obsidian 資料庫外。這個預覽不會開啟連結、圖片、網頁程式碼或 Obsidian 內部跳轉連結。',
    });
    article.createEl('pre', {
      cls: 'privacy-bridge-document-text',
      text: this.content || '內容已清除。',
    });
  }
}
