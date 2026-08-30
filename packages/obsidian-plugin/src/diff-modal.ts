import { Modal, type App } from 'obsidian';
import { displayTypeName, type PreviewHunk } from './workflow.js';

/** LOCKED Diff Preview: independent full-width modal, side-by-side by default. */
export class PrivacyBridgeDiffModal extends Modal {
  private activeIndex = 0;
  private selectedType = 'ALL';
  private hunks: readonly PreviewHunk[];

  constructor(app: App, hunks: readonly PreviewHunk[]) {
    super(app);
    this.hunks = hunks;
  }

  override onOpen(): void {
    this.modalEl.classList.add('privacy-bridge-diff-modal');
    this.render();
  }

  override onClose(): void {
    this.hunks = [];
    this.contentEl.empty();
  }

  private filteredHunks(): readonly PreviewHunk[] {
    return this.selectedType === 'ALL'
      ? this.hunks
      : this.hunks.filter((hunk) => hunk.types.includes(this.selectedType));
  }

  private moveTo(index: number): void {
    const hunks = this.filteredHunks();
    this.activeIndex = Math.max(0, Math.min(index, hunks.length - 1));
    this.render();
    queueMicrotask(() => {
      const target = this.contentEl.querySelector<HTMLElement>(
        `#privacy-bridge-modal-hunk-${this.activeIndex}`,
      );
      target?.scrollIntoView({ block: 'center' });
      target?.focus({ preventScroll: true });
    });
  }

  private render(): void {
    this.contentEl.empty();
    const hunks = this.filteredHunks();
    this.activeIndex = Math.max(0, Math.min(this.activeIndex, hunks.length - 1));
    this.contentEl.createEl('h2', { text: 'Hans SafeDoc 完整比較' });
    this.contentEl.createEl('p', {
      text: '左側是原始內容，右側是安全代碼化內容。這個畫面不會開啟連結、圖片、網頁程式碼或 Obsidian 內部跳轉連結。',
    });
    this.contentEl.createDiv({ cls: 'privacy-bridge-modal-toolbar' }, (toolbar) => {
      toolbar.createDiv({ cls: 'privacy-bridge-modal-filters' }, (filters) => {
        const counts = new Map<string, number>();
        for (const hunk of this.hunks)
          for (const type of hunk.types) counts.set(type, (counts.get(type) ?? 0) + 1);
        const options: readonly [string, string, number][] = [
          ['ALL', '全部', this.hunks.length],
          ...[...counts.entries()].map(
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
            this.activeIndex = 0;
            this.render();
          });
        }
      });
      toolbar.createDiv({ cls: 'privacy-bridge-modal-navigation' }, (navigation) => {
        const previous = navigation.createEl('button', { text: '上一處' });
        previous.disabled = this.activeIndex === 0;
        previous.addEventListener('click', () => this.moveTo(this.activeIndex - 1));
        navigation.createEl('span', {
          text: hunks.length === 0 ? '沒有變更' : `第 ${this.activeIndex + 1} / ${hunks.length} 處`,
          attr: { 'aria-live': 'polite' },
        });
        const next = navigation.createEl('button', { text: '下一處' });
        next.disabled = this.activeIndex >= hunks.length - 1;
        next.addEventListener('click', () => this.moveTo(this.activeIndex + 1));
      });
    });
    this.contentEl.createDiv({ cls: 'privacy-bridge-modal-diff' }, (diff) => {
      hunks.forEach((hunk, index) =>
        diff.createEl(
          'article',
          {
            cls: `privacy-bridge-modal-hunk${index === this.activeIndex ? ' is-active' : ''}`,
            attr: {
              id: `privacy-bridge-modal-hunk-${index}`,
              tabindex: '-1',
              'aria-label': `第 ${index + 1} / ${hunks.length} 處變更，${hunk.types
                .map(displayTypeName)
                .join('、')}`,
            },
          },
          (article) => {
            article.createEl('h3', {
              text: `第 ${hunk.lineNumber} 行 · ${hunk.types.map(displayTypeName).join(' · ')}`,
            });
            article.createDiv({ cls: 'privacy-bridge-modal-columns' }, (columns) => {
              columns.createDiv({ cls: 'privacy-bridge-modal-original' }, (original) => {
                original.createEl('strong', { text: '原始內容' });
                original.createEl('code', { text: hunk.beforeLine });
              });
              columns.createDiv({ cls: 'privacy-bridge-modal-sanitized' }, (sanitized) => {
                sanitized.createEl('strong', { text: '安全代碼化內容' });
                sanitized.createEl('code', { text: hunk.afterLine });
              });
            });
          },
        ),
      );
    });
  }
}
