import { ItemView, type WorkspaceLeaf } from 'obsidian';
import {
  AGENT_LOCAL_PROMPT,
  DICTIONARY_ONLY_LABELS,
  EXTERNAL_AI_PROMPT,
  FILE_FORMAT_SUPPORT,
  MODEL_POLICY,
  SUPPORT_GROUPS,
  SUPPORT_LIMITATIONS,
} from './novice-support.js';

export const PRIVACY_BRIDGE_HELP_VIEW = 'privacy-bridge-help';
export type TutorialStage = 'NOT_SCANNED' | 'SCANNED' | 'PREVIEW_READY' | 'EXPORTED';

const EXTERNAL_TOOL_PROMPT = EXTERNAL_AI_PROMPT;

const STAGE_LABELS: Readonly<Record<TutorialStage, string>> = {
  NOT_SCANNED: '尚未掃描：選擇 MD、TXT 或 CSV；已打開的 MD 也可直接掃描。',
  SCANNED: '已完成掃描：請逐項決定，或批次確認後建立預覽。',
  PREVIEW_READY: '已建立預覽：請檢查變更，再建立安全代碼化輸出。',
  EXPORTED: '已完成輸出：只把配對的安全分析包 ZIP 與 analysis-request.json 交給其他工具。',
};

/** Static, text-node-only guidance. It never receives source or token mapping data. */
export class PrivacyBridgeHelpView extends ItemView {
  private stage: TutorialStage = 'NOT_SCANNED';

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }
  override getViewType(): string {
    return PRIVACY_BRIDGE_HELP_VIEW;
  }
  override getDisplayText(): string {
    return 'Hans SafeDoc 新手教學';
  }
  override getIcon(): string {
    return 'book-open';
  }
  setStage(stage: TutorialStage): void {
    this.stage = stage;
    this.render();
  }
  override async onOpen(): Promise<void> {
    this.render();
  }
  private render(): void {
    this.containerEl.empty();
    const tutorial = this.containerEl.createEl('article', { cls: 'privacy-bridge-help-view' });
    tutorial.createEl('h1', { text: 'Hans SafeDoc 新手教學' });
    tutorial.createEl('p', {
      cls: 'privacy-bridge-help-current-step',
      text: `你現在在這一步：${STAGE_LABELS[this.stage]}`,
      attr: { 'aria-live': 'polite' },
    });
    tutorial.createEl('p', {
      cls: 'privacy-bridge-tutorial-warning',
      text: '如果工作最後需要換回個資，建立輸出時務必保管好本次 Job 的還原密碼；Hans SafeDoc 不會儲存密碼，也無法代為找回。',
    });
    tutorial.createEl('h2', { text: '使用前先確認支援範圍' });
    tutorial.createEl('p', {
      text: '可選擇 MD、TXT、CSV、DOCX 或 XLSX，以本機固定規則找出疑似敏感資料。Office 文件只接受安全結構，圖片、metadata、連結與名稱必須逐項確認；公式、註解、修訂、外部資料、巨集與未知結構會停止處理。自動偵測不能保證完整，輸出前仍需人工檢查。',
    });
    const supportGrid = tutorial.createDiv({ cls: 'privacy-bridge-support-grid' });
    for (const group of SUPPORT_GROUPS) {
      const card = supportGrid.createDiv({ cls: 'privacy-bridge-support-card' });
      card.createEl('h3', { text: group.title });
      card.createEl('p', { text: group.items });
    }
    tutorial.createEl('h3', { text: '偵測限制' });
    tutorial.createEl('ul', {}, (list) => {
      for (const limitation of SUPPORT_LIMITATIONS) list.createEl('li', { text: limitation });
    });
    tutorial.createEl('h3', { text: '工作階段客戶字典' });
    tutorial.createEl('p', {
      text: `${DICTIONARY_ONLY_LABELS.join('、')}可透過「匯入客戶字典」做精確比對。字典只存在記憶體，不寫入 Obsidian 資料庫或外掛設定；鎖定工作區或關閉外掛後會清除。`,
    });
    tutorial.createEl('h3', { text: '檔案格式（中央支援矩陣）' });
    tutorial.createEl('ul', {}, (list) => {
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
    tutorial.createEl('h3', { text: '本機 Agent 指令' });
    tutorial.createEl('pre', { cls: 'privacy-bridge-help-prompt', text: AGENT_LOCAL_PROMPT });
    tutorial.createEl('p', {
      text: '其他尚未開放：Obsidian 手機版與掃描整個 Obsidian 資料庫。安全還原只接受符合 result-package.schema.json 的單一 UTF-8 JSON，不接受 Markdown、Office、PDF 或其他格式。',
    });
    tutorial.createEl('h2', { text: '固定規則與網路' });
    tutorial.createEl('p', { text: MODEL_POLICY.summary });
    tutorial.createEl('p', {
      text: '文件掃描完全在本機執行，不會把文件內容交給外部服務。正式版沒有模型下載、模型匯入或模型推論；固定規則仍可能漏掉人名與組織，輸出前必須人工檢查。',
    });
    tutorial.createEl('h2', { text: '如何轉換、輸出並交給其他工具' });
    tutorial.createEl('ol', {}, (steps) => {
      for (const step of [
        '點 Hans SafeDoc 的「選擇檔案」處理 MD、TXT 或 CSV；已打開的 MD 筆記也可點左側盾牌。',
        '檢查偵測結果。你可以逐項決定，或選擇「全部安全代碼化並預覽」。',
        '確認批次處理後，用「只看變更」檢查每個變更位置的前後內容。需要左右完整比較時，點「開啟完整比較」。',
        '在右側預覽按 Alt+← 或 Alt+→，可以快速移到上一處或下一處變更。',
        '按「建立安全代碼化輸出」，設定至少 12 個字元且不會被儲存的還原密碼。原始檔不會被修改。',
        '按「顯示輸出位置」，先用原生安全副本在本機確認版面；這份副本不作為 Result JSON 的信任來源。',
        '上傳前再次確認 .safe-package.zip 與 .analysis-request.json 位於 Hans SafeDoc Outputs 資料夾，不要上傳原始檔、代碼對照資料、字典或金鑰。',
        '把下方提示詞貼給其他工具，要求它完整保留安全代碼。',
        '把同時產生的 .safe-package.zip 與 .analysis-request.json 一起交給其他工具，只接受符合 result-package.schema.json 的單一 UTF-8 JSON 回傳；原生安全副本只用於本機版面檢查。',
        '按「還原 AI 結果」，選擇 Result JSON、原本的 Job 並輸入密碼。只有 schema、Job、安全分析包雜湊、不含原文的文件 ID 與每個安全代碼都驗證通過，才會在 Hans SafeDoc Restored 建立新 Result Vault。',
      ])
        steps.createEl('li', { text: step });
    });
    tutorial.createEl('h3', { text: '給其他工具的提示詞' });
    tutorial.createEl('pre', { cls: 'privacy-bridge-help-prompt', text: EXTERNAL_TOOL_PROMPT });
    tutorial.createEl('p', { text: '需要使用時，請手動選取上方提示詞。' });
    tutorial.createEl('h2', { text: '如何安全還原' });
    tutorial.createEl('p', {
      cls: 'privacy-bridge-tutorial-warning',
      text: '還原副本會再次包含個資，請留在本機並依正式資料管理規範保護；不要把還原副本上傳雲端。',
    });
    tutorial.createEl('ol', {}, (steps) => {
      for (const step of [
        '確認 AI 只回傳一個符合 result-package.schema.json 的 UTF-8 JSON object，沒有程式碼圍欄或額外文字。',
        '在 Hans SafeDoc 按「還原 AI 結果」，選擇 Result JSON。',
        '從本機清單選擇建立安全輸出時的 Job，輸入當時設定的密碼。',
        'Hans SafeDoc 會驗證加密對照表、schema、Job、安全分析包雜湊、不含原文的文件 ID、每一個安全代碼與輸出重開結果；未知、缺損或偽造代碼會使整包流程停止。',
        '驗證通過後只會在 Obsidian 資料庫旁的 Hans SafeDoc Restored 建立 findings.md、findings.json 與 restore-manifest.json，不覆寫 AI 回傳檔、原始檔或安全輸出。',
      ])
        steps.createEl('li', { text: step });
    });
  }
}
