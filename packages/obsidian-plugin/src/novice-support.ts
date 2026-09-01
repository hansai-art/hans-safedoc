import type { CandidateType } from '@privacy-bridge/core';

export const SECURITY_NOTICE_VERSION = '1.3.0';

export type FileSupportMode = 'SUPPORTED_READ_ONLY' | 'LOCAL_AGENT_TO_MD_ONLY' | 'BLOCKED';

export interface FileFormatSupport {
  readonly extension: string;
  readonly label: string;
  readonly mode: FileSupportMode;
  readonly guidance: string;
}

/** Single source of truth for README, first-run, persistent help, and the picker. */
export const FILE_FORMAT_SUPPORT: readonly FileFormatSupport[] = [
  {
    extension: 'md',
    label: 'Markdown（.md）',
    mode: 'SUPPORTED_READ_ONLY',
    guidance: '唯讀來源；輸出為新副本。',
  },
  {
    extension: 'txt',
    label: 'UTF-8 純文字（.txt）',
    mode: 'SUPPORTED_READ_ONLY',
    guidance: '唯讀來源；僅接受嚴格 UTF-8。',
  },
  {
    extension: 'csv',
    label: 'CSV（.csv）',
    mode: 'SUPPORTED_READ_ONLY',
    guidance: '唯讀來源；自動判斷分欄方式，只有模糊時才詢問；主動內容會阻擋。',
  },
  {
    extension: 'docx',
    label: 'Word OOXML（.docx）',
    mode: 'SUPPORTED_READ_ONLY',
    guidance: '唯讀來源；只接受安全結構，圖片必須逐張確認後原樣保留。',
  },
  {
    extension: 'xlsx',
    label: 'Excel OOXML（.xlsx）',
    mode: 'SUPPORTED_READ_ONLY',
    guidance: '唯讀來源；只接受無公式、無註解及無外部資料的安全結構。',
  },
  {
    extension: 'pdf',
    label: 'PDF（.pdf）',
    mode: 'LOCAL_AGENT_TO_MD_ONLY',
    guidance: '外掛不直接處理；請本機 AI Agent 先轉成 MD，再重新選擇。',
  },
  {
    extension: 'doc',
    label: '舊版 Word（.doc）',
    mode: 'BLOCKED',
    guidance: '阻擋；請先在本機另存為 DOCX。',
  },
  {
    extension: 'xls',
    label: '舊版 Excel（.xls）',
    mode: 'BLOCKED',
    guidance: '阻擋；請先在本機另存為 XLSX。',
  },
  { extension: 'rtf', label: 'RTF（.rtf）', mode: 'BLOCKED', guidance: '阻擋。' },
  {
    extension: 'odt,ods',
    label: 'OpenDocument（.odt/.ods）',
    mode: 'BLOCKED',
    guidance: '阻擋。',
  },
  {
    extension: 'image',
    label: '圖片、音訊、影片及其他二進位附件',
    mode: 'BLOCKED',
    guidance: '阻擋。',
  },
  { extension: 'canvas', label: 'Obsidian 畫布（Canvas）', mode: 'BLOCKED', guidance: '阻擋。' },
  { extension: 'base', label: 'Obsidian 資料庫檢視（Bases）', mode: 'BLOCKED', guidance: '阻擋。' },
] as const;

export const SUPPORTED_EXTERNAL_EXTENSIONS = FILE_FORMAT_SUPPORT.filter(
  (item) => item.mode === 'SUPPORTED_READ_ONLY',
).map((item) => item.extension) as unknown as readonly ['md', 'txt', 'csv', 'docx', 'xlsx'];

export const FILE_PICKER_EXTENSIONS = FILE_FORMAT_SUPPORT.flatMap((item) =>
  item.extension.split(','),
).filter((extension) => /^[a-z0-9]+$/u.test(extension));

export const AGENT_LOCAL_PROMPT = `請在本機協助我使用 Hans SafeDoc 處理文件，原始文件不得上傳到任何雲端服務。

檔案：〔貼上本機檔案路徑〕

執行規則：
1. 若來源是 PDF，先在本機以確定性工具逐頁轉成 Markdown；不得用線上轉檔或把原文交給雲端 AI。遇掃描頁、空白頁或無法確認的頁面必須停下來請我處理。
2. 使用 Hans SafeDoc 選擇 MD、TXT、CSV、DOCX 或 XLSX；不得直接修改、移動或刪除原始文件。Office 文件遇到公式、註解、修訂、外部資料、巨集或未知結構時必須停止，不得繞過。
3. CSV 先用確定性 parser 自動判斷分欄方式；只有多種結果同時合理時才請我選擇。不得使用 LLM 猜測。格式被阻擋時，回報白話原因與修復方式，不得繞過安全檢查。
4. 出現任何待審核項目時必須停下來，逐項顯示給我決定；不得代替我接受、忽略或批次確認。
5. 只有重新開檔與殘留檢查都通過後，才可回報安全副本路徑；同時確認原始文件未改變。
6. 不得讀取未指定檔案、其他 Obsidian Vault、對照資料、字典、金鑰或憑證。`;

export const EXTERNAL_AI_PROMPT = `請只處理我指定的 Hans SafeDoc 安全分析包（Safe Package）ZIP 與配對的 analysis-request.json。安全分析包只含已代碼化的分析內容與驗證資訊，不含原文對照。不要讀取其他 Obsidian Vault、原始筆記、原生安全副本、Hans SafeDoc 對照資料、字典、金鑰或其他未指定檔案。

安全分析包：〔貼上 Hans SafeDoc Outputs 內 .safe-package.zip 的路徑，或直接附加該檔案〕
分析請求：〔貼上同時產生的 .analysis-request.json 路徑，或直接附加該檔案〕
任務：〔清楚填寫要 AI Agent 執行的分析、摘要、翻譯或改寫工作〕

執行規則：
1. 完整保留每一個形如 ⟦PB:…⟧ 的安全代碼，其字元、大小寫、順序與出現次數都不得改變。
2. 不得修改、拆開、刪除、合併、重新產生或猜測安全代碼代表的原始資料，也不得嘗試還原個資。
3. 只引用 analysis-request.json 明列的 jobId、sourcePackageHash 與 allowedDocumentIds；不得自行產生或修改這些綁定值。
4. 僅根據這份安全分析包完成任務；不得用網路、其他檔案或外部資料補猜被代碼取代的內容。
5. 完成後先自行核對所有安全代碼是否逐字一致。若無法保證完整保留，請停止處理並回報「安全代碼完整性無法確認」，不要輸出可能損壞的文件。
6. 只輸出一個符合 result-package.schema.json 的 UTF-8 JSON object，不要使用 Markdown 程式碼圍欄、不要加入說明文字、不要加入 schema 未允許的欄位。每筆 findingId 必須是 UUIDv4，entityRefs 只能使用安全檔案中完整出現的代碼。`;

export const ALPHA_BUILT_IN_TYPES = [
  'TW_ID',
  'TW_ARC',
  'TW_TAX_ID',
  'TW_PASSPORT',
  'PASSPORT_CANDIDATE',
  'TW_NHI_CARD',
  'TW_MOBILE',
  'TW_LANDLINE',
  'TW_PHONE_SERVICE',
  'TW_ADDRESS',
  'TW_POSTCODE',
  'TW_PLATE',
  'TW_INVOICE',
  'TW_BANK_ACCOUNT',
  'CREDIT_CARD',
  'EMAIL',
  'IPV4',
  'URL',
  'LINE_ID',
  'SECRET',
  'AMBIGUOUS_IDENTIFIER',
] as const satisfies readonly CandidateType[];

export const DICTIONARY_ONLY_TYPES = [
  'PERSON',
  'ORGANIZATION',
  'PROJECT',
  'PRODUCT',
  'DEPARTMENT',
  'SYSTEM',
  'CUSTOM_TERM',
] as const satisfies readonly CandidateType[];

export const DICTIONARY_ONLY_LABELS = [
  '人名',
  '組織',
  '專案',
  '產品',
  '部門',
  '系統',
  '自訂詞',
] as const;

export const UNSUPPORTED_FILE_TYPES = FILE_FORMAT_SUPPORT.filter(
  (item) => item.mode !== 'SUPPORTED_READ_ONLY',
).map((item) => item.label);

export const MODEL_POLICY = {
  required: false,
  userSelectable: false,
  offlineInstallSupported: false,
  distributionEnabled: false,
  summary:
    '正式版不提供模型安裝。自建模型未達既定品質門檻，第三方模型也未通過正式分發的授權與來源審查；目前使用可稽核的本機固定規則，並可由使用者選擇匯入只存在於工作階段的精確比對客戶字典。',
} as const;

export const SUPPORT_GROUPS = [
  {
    title: '臺灣身分與證件',
    items: '身分證、居留證、統一編號、疑似護照號碼、健保卡號',
  },
  {
    title: '聯絡與位置',
    items: '手機、市話、服務電話、地址、郵遞區號、電子郵件（Email）、LINE 帳號',
  },
  {
    title: '財務與識別碼',
    items: '信用卡、銀行帳號、發票號碼、車牌',
  },
  {
    title: '網路與機密',
    items:
      '網路位址（IPv4）、網址（URL）、機密字串、登入權杖（JWT）、外部服務金鑰（API Key）、資料庫連線密碼',
  },
] as const;

export const SUPPORT_LIMITATIONS = [
  '信用卡、機密字串與無法判定類型的識別碼不會自動轉換。只要發現這類資料，系統就會停止輸出，必須先人工處理。',
  '疑似護照號碼與健保卡純數字在缺少同一行文字、欄位名稱或標籤提示時，可能不會被列為待確認項目。',
  '格式、證號檢查或文字前後關係不足時，仍可能漏掉資料或判斷錯誤。安全輸出前必須人工檢查。',
  '客戶字典只做精確文字與明列別名比對，不做模糊猜測；字典只保留於目前工作階段，鎖定或關閉外掛後必須重新匯入。',
] as const;

export const NOVICE_DEMO_FOLDER = 'Hans SafeDoc 安全練習';
export const NOVICE_DEMO_PATH = `${NOVICE_DEMO_FOLDER}/開始練習.md`;
export const NOVICE_DEMO_MARKDOWN = `---
文件性質: 合成練習資料
主要窗口: 測試人員甲
聯絡電話: 0912-345-671
電子郵件: practice01@example.invalid
---

# 晨光商店客服改善計畫：本月營運整理

> 本文件全部是合成測試資料，不對應任何真實人物、商店或案件。內容刻意保留常見的混亂格式，用來確認敏感資料轉換後，營運資訊仍可繼續分析。

## 本月營運摘要

本月共收到 48 件客服案件，比上月多 6 件。增加的案件主要來自新版結帳流程，尤其是第一次使用手機付款的顧客。

- 產品操作 18 件
- 帳務付款 11 件
- 配送進度 9 件
- 其他問題 10 件

案件地區分布為北區 21 件、中區 14 件、南區 13 件。聯絡管道以 LINE 訊息 22 件最多，其次是電子郵件 17 件與電話 9 件。

- 平均第一次回覆時間：7.2 小時
- 服務目標：4 小時內第一次回覆
- 已完成：31 件
- 仍需追蹤：12 件
- 等待客戶補資料：5 件
- 整體滿意度：3.6 / 5
- 重複開啟案件：8 件

## 零散客戶紀錄

北區的測試人員乙反映手機版找不到取消訂單入口。她希望先用電話說明，號碼是 0912-345-672，整理後再寄到 practice02@example.invalid。

中區案件沒有填完整表單，只留下這些內容：

- 聯絡人：測試人員丙
- 手機 0912-345-673
- 電子郵件 practice03@example.invalid
- 問題：付款成功後，畫面仍顯示尚未付款

> 客戶原話：「我已經重新整理三次，訂單還是沒有更新。」測試人員丁希望下午聯絡，電話 0912-345-674，電子郵件 practice04@example.invalid。

## 從舊系統貼過來的表格

欄位有缺漏、空白不一致，也有人把聯絡資料和備註寫在同一格。

|案件|地區 | 類別|處理結果 | 花費時間 | 備註|
|---|---|---|---|---:|---|
| A-01 |北區|產品操作 | 已完成|5.5 小時|測試人員戊／0912-345-675／practice05@example.invalid，已教會修改收件地址|
|A-02| 中區 |帳務付款|待追蹤 |11 小時|測試人員己 0912-345-676，practice06@example.invalid，還缺付款畫面|
| A-03 |南區|配送進度| 已完成 | 3 小時 |物流資訊晚了一天，無需再次聯絡|
|A-04|北區 |其他|等待資料| 16 小時|只寫「晚點補」，沒有留下有效聯絡方式|

## 待辦與追蹤

- [x] 整理常見付款問題
- [ ] 明早回電給測試人員庚：0912-345-677
- [ ] 將操作圖寄給 practice07@example.invalid
- [ ] 確認配送頁是否能顯示預計到貨區間
- [ ] 把「取消訂單」移到更容易看到的位置

## 客服信件轉貼

寄件人：測試人員辛 <practice08@example.invalid>
回電：0912-345-678
主旨：同一張訂單收到兩次付款通知

我只有付款一次，但早上和中午各收到一封通知。客服已確認沒有重複扣款，顧客仍擔心之後會再扣一次。

## 會議中的隨手筆記

測試人員壬，0912-345-679，practice09@example.invalid。她在通勤途中操作，網路切換後畫面卡住。這一件先列入產品操作，不要歸到帳務問題。

另有一筆南區案件是口頭轉述：測試人員癸 / 0912-345-680 / practice10@example.invalid。客戶說包裹已收到，但系統還停在配送中。

與客服分析無關的雜項也混在原始文件裡：下週簡報沿用藍色封面、會議室冷氣太冷、茶水間咖啡豆需要補貨。這些內容不應被改動。

## 初步觀察

1. 產品操作案件最多，但回覆速度不一定最慢。
2. 帳務付款雖然只有 11 件，卻最容易重複開啟。
3. 北區案件量最高，可能只是使用者較多，不能直接判定北區問題最嚴重。
4. 部分案件的聯絡資料藏在句子、轉貼信件與待辦事項中，不只出現在表格。

## 請協助分析

把安全代碼化後的文件交給分析工具，請它回答：

1. 哪一類問題最值得先改善，理由是什麼？
2. 哪些數據顯示客服流程可能卡住？
3. 地區差異是否足以支持調整人力？還缺哪些資料？
4. 請整理三項下週可以執行的改善行動。

分析工具應該看得到案件數、處理時間、滿意度、問題內容和待辦事項，但看不到原始手機與電子郵件。
`;

export interface NoviceSettings {
  readonly securityNoticeAccepted: boolean;
  readonly securityNoticeVersion: string | undefined;
  readonly onboardingCompleted: boolean;
  readonly localModelEnabled: boolean;
}

export function normalizeNoviceSettings(value: unknown): NoviceSettings {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const accepted =
    record.securityNoticeAccepted === true &&
    record.securityNoticeVersion === SECURITY_NOTICE_VERSION;
  return {
    securityNoticeAccepted: accepted,
    securityNoticeVersion: accepted ? SECURITY_NOTICE_VERSION : undefined,
    onboardingCompleted: record.onboardingCompleted === true,
    localModelEnabled: record.localModelEnabled === true,
  };
}
