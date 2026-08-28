import { ItemView, type WorkspaceLeaf } from 'obsidian';

export const PRIVACY_BRIDGE_PREVIEW_VIEW = 'privacy-bridge-sanitized-preview';

/** Safe reading view: renders structure with text nodes only, never HTML or external resources. */
export class PrivacyBridgePreviewView extends ItemView {
  private title = '去識別化預覽';
  private content = '';

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }
  override getViewType(): string {
    return PRIVACY_BRIDGE_PREVIEW_VIEW;
  }
  override getDisplayText(): string {
    return this.title;
  }
  override getIcon(): string {
    return 'shield-check';
  }
  setDocument(title: string, content: string): void {
    this.title = `${title}（去識別化預覽）`;
    this.content = content;
    this.render();
  }
  override async onOpen(): Promise<void> {
    this.render();
  }
  private render(): void {
    this.containerEl.empty();
    const article = this.containerEl.createDiv({ cls: 'privacy-bridge-document-preview' });
    article.createEl('p', {
      cls: 'privacy-bridge-preview-notice',
      text: '安全預覽：正式輸出仍位於 Vault 外；此分頁不執行連結、圖片、HTML 或 Obsidian URI。',
    });
    for (const line of this.content.split(/\r?\n/u)) {
      const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
      if (heading) {
        const level = heading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6;
        article.createEl(`h${level}`, { text: heading[2]! });
      } else if (line.trim()) article.createEl('p', { text: line });
    }
  }
}
