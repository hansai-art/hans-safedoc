import { Modal, type App } from 'obsidian';
import type { RestoreDryRunReport } from './restore-workflow.js';

export class RestoreDryRunModal extends Modal {
  private settled = false;

  constructor(
    app: App,
    private readonly report: RestoreDryRunReport,
    private readonly finish: (confirmed: boolean) => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: '還原前驗證已通過' });
    this.contentEl.createEl('p', {
      text: `找到 ${this.report.findingCount} 筆 AI 分析結果。現在尚未建立或修改任何還原檔案。`,
    });
    this.contentEl.createEl('ul', { attr: { 'aria-label': '還原 Dry Run 驗證結果' } }, (list) =>
      this.report.checks.forEach((check) => list.createEl('li', { text: `通過：${check}` })),
    );
    this.contentEl.createEl('p', {
      text: `Job：${this.report.jobId} · Package Hash：${this.report.packageHash.slice(0, 12)}…`,
    });
    this.contentEl.createEl('p', {
      text: '下一步會建立新的 Result Vault，不會覆寫原始文件、安全副本或 AI 回傳檔。還原後重新包含個資，不可上傳雲端。',
    });
    const cancel = this.contentEl.createEl('button', { text: '取消' });
    cancel.addEventListener('click', () => this.close());
    const confirm = this.contentEl.createEl('button', {
      text: '確認建立還原副本',
      cls: 'mod-cta',
    });
    confirm.addEventListener('click', () => {
      this.settled = true;
      this.finish(true);
      this.close();
    });
  }

  override onClose(): void {
    this.contentEl.empty();
    if (!this.settled) this.finish(false);
  }
}
