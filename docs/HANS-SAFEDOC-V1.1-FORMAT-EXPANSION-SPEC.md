# Hans SafeDoc v1.1 格式擴充規格

**版本：** 1.1.0 LOCKED  
**日期：** 2026-08-29  
**狀態：** 已核准，作為 v1.1 實作與上架驗收正本  
**適用產品：** Hans SafeDoc，現有外掛相容識別仍為 `privacy-bridge`  
**規格目的：** 在不破壞 v1.0 安全邊界的前提下，逐步加入 TXT、CSV、DOCX、XLSX，並正式定義 PDF 由 AI Agent 在進入知識庫前轉為 MD 的推薦路徑。

---

## 1. 權威與版本邊界

1. `docs/MASTER-SPEC.md`、`docs/UX-STATE-MAP.md`、`docs/DECISION-REGISTER.md`、現行 schemas 與 Acceptance Matrix 仍是 v1.0 LOCKED 正本。
2. 本文件不回寫或修改 v1.0 frozen 文件。後續版本只以明列的 versioned supersession 擴充 v1.1 Job，不以新需求改寫 v1.0 歷史正本。
3. v1.0 仍只正式支援 UTF-8 Markdown。
4. 本文件建立獨立的 v1.1 格式擴充契約。只有單一格式通過該格式全部 Release Gate 後，才可在產品中標示正式支援。
5. 本文件已鎖定；production implementation 依 Phase 0 至 Phase 5 連續執行。隔離的唯讀 feasibility spike 不得直接併入正式程式。
6. 衝突優先序：v1.0 未被本節明列取代的安全不變量 → 本 v1.1 規格 → v1.1 schemas → v1.1 Acceptance Matrix → fixtures → code。
7. v1.1 的 versioned supersession 必須按下表機械判定，不得用「精神相同」擴張：

| v1.0 ID | v1.0 歷史語義 | v1.1 新 Job 語義 | 未變部分 |
|---|---|---|---|
| `DEC-002`、`DEC-084` | 產品顯示 Privacy Bridge | v1.1 UI／文件顯示 Hans SafeDoc | Plugin ID、內部 namespace、v1.0 UI 快照與歷史紀錄不改 |
| `DEC-008`、`PB-SCOPE-002` | 只處理 UTF-8 MD | v1.1 Job 可處理逐格式放行的 TXT／CSV／DOCX／XLSX | 既有 MD Job 永遠走 v1.0 契約 |
| `DEC-009`、`PB-SCOPE-003` | Office／binary 為 unsupported | 只對本規格 allowlist 內且已放行的精確格式解除 | 未分類 part、舊格式、巨集、加密及其他附件仍 fail closed |
| `DEC-011`、`PB-SHADOW-002` | Shadow 產生安全 MD | v1.1 Shadow 可產生同副檔名安全 artifact | Vault 外、無 Mapping／Key／原始值、完整 Token 等限制不改 |
| `PB-JOB-002`／`003` | v1.0 Job states | v1.1 不新增 Job state；只讓 `BUILDING_SHADOW` 依格式產生同格式 artifact | `EXPORTED` 仍只代表完整 Safe Package Export Gate 通過 |

8. 既有 Markdown Job 永遠走 v1.0 snapshot、cancel、Mapping、state、Safe Package、Result 與 Restore 契約。PDF 前置轉出的外部 MD 可新增 file-selection 能力，但進入後仍建立／使用 v1.0 Markdown Job，不套用 v1.1 FormatAdapter。
9. v1.1 TXT／CSV／DOCX／XLSX Job 每個 Job 固定一份來源文件、單一格式，不允許 mixed-format Job。這讓 snapshot、decision invalidation、artifact 與 transaction scope 可機械判定。
10. 除上表明列範圍外，v1.0 Token、Mapping、Crypto、Audit、Source Read-only、Residual、Export Guard、Result、Restore、Backup、Recovery、Network、Accessibility 與 Release Gate 全部維持控制地位。

---

## 2. 已確認產品決策

| ID | 決策 | 固定內容 | 後果 |
|---|---|---|---|
| HSD-DEC-001 | 顯示名稱 | Hans SafeDoc | 使用者介面、README 與說明使用新名稱 |
| HSD-DEC-002 | 相容識別 | Plugin ID、既有資料目錄、command ID 與 repo 可維持 `privacy-bridge` | 不破壞更新、設定、舊工作紀錄與安裝路徑 |
| HSD-DEC-003 | 安全代碼 | 正式代碼繼續使用完整 `⟦PB:TYPE:ENTITY_ID:TAG⟧` | 不改 Token、Mapping、還原與驗證相容性 |
| HSD-DEC-004 | 外掛數量 | 維持單一 Obsidian Desktop 外掛 | 不另做 Word／Excel 預覽外掛 |
| HSD-DEC-005 | 新格式順序 | TXT → CSV → DOCX → XLSX | 每種格式獨立 Gate，不綁成一次發布 |
| HSD-DEC-006 | PDF | Hans SafeDoc 不直接讀寫 PDF | AI Agent 在文件進入知識庫前於本機轉成 MD |
| HSD-DEC-007 | PDF 轉換責任 | AI Agent 只負責調用本機確定性抽取／OCR 工具，不用 LLM 摘要取代原文 | 避免漏字、改寫與原始 PDF 上傳外部服務 |
| HSD-DEC-008 | Office 預覽 | Hans SafeDoc 只提供安全內容檢查，不重做 Word／Excel 完整版面預覽 | 正式版面由原生 Word／Excel 開啟安全副本確認 |
| HSD-DEC-009 | Office 輸出 | 來源唯讀，Vault 外建立相同副檔名的新安全副本 | 不覆寫原始 DOCX／XLSX |
| HSD-DEC-010 | 原格式承諾 | 保留容器類型、未修改結構與樣式；不承諾 byte-identical、像素相同、分頁不變 | 長安全代碼可能造成 Word 換行或 Excel 顯示調整 |
| HSD-DEC-011 | 不支援舊格式 | `.doc`、`.xls`、`.docm`、`.xlsm`、`.xlsb`、`.odt`、`.ods`、Pages、Numbers 先排除 | 避免舊二進位格式、巨集及擴張失控 |
| HSD-DEC-012 | 失敗政策 | Fail closed | 未涵蓋結構、無法重開、可能漏掃時不得產生安全副本 |
| HSD-DEC-013 | 解析方式 | 正式輸出不得由簡化預覽重建 | 必須對原容器副本做可追溯的局部 rewrite |
| HSD-DEC-014 | 網路與模型 | 文件處理與模型推論為零網路、零遙測；模型執行元件必須隨外掛 `main.js` 發布，不得在執行時安裝或更新依賴。只有使用者明確選擇線上安裝時，才可由固定 HTTPS URL 下載固定 revision 的選用小模型資料，且逐檔驗證大小與 SHA-256；另提供同 manifest 的離線包 | 無模型時支援格式仍完整可用；模型只增加人工審核候選。source、dependency、bundle、runtime 四層必須證明文件內容無外洩路徑 |
| HSD-DEC-015 | 第一版操作入口 | 單一主要按鈕「選擇檔案」與檔案右鍵「用 Hans SafeDoc 建立安全副本」 | 不強制接管所有 Office 副檔名，不與其他預覽外掛衝突 |
| HSD-DEC-016 | PDF 新增知識路徑 | PDF 與轉出的原始 MD 優先留在 Vault 外；Hans SafeDoc 完成後只把安全 MD 放進知識庫 | 避免未安全化 MD 被 Sync 或其他外掛先讀取 |

---

## 3. 產品目標

v1.1 讓完全不懂技術的使用者可以：

1. 在 Obsidian Desktop 選擇一份支援文件。
2. 清楚知道原始檔不會被修改。
3. 知道系統實際檢查了哪些內容、哪些內容尚未檢查或不支援。
4. 對每個待確認項目選擇安全代碼化、保留原文或依 v1.0 規則阻擋／遮罩。
5. 在 Vault 外建立新的安全副本。
6. 用預設文字程式、Word 或 Excel 開啟安全副本。
7. 明確區分原始檔與安全副本。
8. 只有在輸出重新開檔、自我驗證與剩餘敏感資料檢查通過後，才看到「安全副本已建立」。

---

## 4. 非目標

v1.1 不做：

- 不直接處理 PDF。
- 不內建 PDF 轉換器。
- 不上傳 PDF 到線上轉換網站。
- 不用 LLM 摘要、重寫或猜測 PDF 原文。
- 不做完整 Word 或 Excel 編輯器。
- 不承諾 Office 版面像素不變。
- 不支援舊式 `.doc`、`.xls`。
- 不支援巨集與可執行 Office 格式。
- 不修改原始文件。
- 不自動接受偵測結果。
- 不把未檢查圖片、嵌入物件、外部資料或快取默默帶入安全副本。
- 不因格式擴充而降低 v1.0 Token、Mapping、Audit、Export Guard 或 lock cleanup 要求。
- 不在同一 release 一次宣稱四種新格式都正式支援。

---

## 5. 格式能力矩陣

### 5.0 基礎產品前置 Gate

格式 spike 可在隔離目錄先行，但任何 v1.1 production merge／公開測試版不得繞過現有產品未完成 Gate：

- 一般使用者可操作的安全還原介面
- 客戶字典介面與 key-envelope 契約
- 正式輸出流程完整接線的殘留敏感資料檢查
- 完整 PB-PERF Gate，不以單一 Node smoke 代替
- macOS／Windows fresh profile
- keyboard-only、VoiceOver／Narrator
- 360／420／480 px 完整旅程
- 獨立安全審查

v1.0 的 105 Acceptance 通過是必要條件，但不是上述人工與整合 Gate 的替代證據。格式擴充不得掩蓋或延後基礎安全債。

| 格式 | v1.0 | v1.1 目標 | 輸出 | 第一版正式邊界 |
|---|---:|---:|---|---|
| `.md` | 正式支援 | 保持支援 | `.md` | 沿用 v1.0 |
| `.txt` | 不支援 | Phase 1 | `.txt` | UTF-8／UTF-8 BOM，保留換行與未修改 bytes |
| `.csv` | 不支援 | Phase 2 | `.csv` | UTF-8／UTF-8 BOM，有限且明示方言，不重排欄列 |
| `.docx` | 不支援 | Phase 3 | `.docx` | 標準 OOXML 安全集合，不含修訂、巨集、加密、未知嵌入物件 |
| `.xlsx` | 不支援 | Phase 4 | `.xlsx` | 標準 OOXML 安全集合，不含巨集、外部連線、Power Query、樞紐快取 |
| PDF | 不支援 | Agent pre-ingest only | `.md` | Agent 在進 Vault 前本機確定性轉換 |
| `.doc`／`.xls` | 不支援 | 不規劃 | 無 | 使用者先以 Word／Excel 另存現代格式 |
| 掃描型 PDF | 不支援 | Agent pre-ingest only | `.md` | Agent 使用本機 OCR，需頁面覆蓋驗證 |

產品不得使用模糊的「支援 Office」。必須顯示精確副檔名與限制。

---

## 6. PDF → MD 的 AI Agent 推薦路徑

### 6.1 固定資料流

```text
原始 PDF 位於知識庫外
→ AI Agent 判斷是否有文字層
→ 本機確定性文字抽取
→ 若為掃描頁，使用本機 OCR
→ 逐頁覆蓋檢查
→ 在 Vault 外暫存 UTF-8 原始 MD
→ 人工或 Agent 對照頁數、標題、表格與空白頁
→ Hans SafeDoc 以「選擇檔案」處理 Vault 外的原始 MD
→ Vault 外建立安全 MD
→ 只有安全 MD 進入 Obsidian 知識庫
```

### 6.2 硬規則

1. Agent 是操作協調者，不以生成式摘要代替文字抽取。
2. 不得把原始 PDF 上傳到線上轉檔網站、遠端 OCR 或未明確授權的雲端模型。
3. 文字型 PDF 必須以本機 parser 抽取，不做內容改寫。
4. 掃描型 PDF 必須以本機 OCR；需記錄總頁數、成功抽取頁數、OCR 頁數與空白／失敗頁數。
5. 任何頁面沒有文字、順序明顯錯亂或表格嚴重缺漏時，MD 不得標記為「已完成轉換」。
6. 產出的 MD 必須是嚴格 UTF-8，絕對路徑不得寫進可交付內容。
7. Hans SafeDoc 只對轉換後 MD 的內容負責，不能宣稱原 PDF 的所有資訊已被處理。
8. PDF 原檔與未安全化的轉換 MD 不得因推薦流程自動複製進 Vault。
9. 若既有工作流程必須先把原始 MD 放入 Obsidian，只能使用專用、本機、關閉 Sync 且停用無關外掛的來源 Vault；這是相容例外，不是首選推薦。
10. 教學固定文案：

> PDF 請先由 AI Agent 在本機轉成 MD，並讓 Hans SafeDoc 先處理 Vault 外的原始 MD。完成後只把安全 MD 放進 Obsidian。Hans SafeDoc 不會直接讀取 PDF，也不能保證 PDF 中沒有轉進 MD 的內容已被檢查。

### 6.3 PDF Agent 驗收

- 文字型 PDF：頁數一致、每頁至少有頁面邊界紀錄、抽取覆蓋無未解釋空白頁。
- 掃描型 PDF：每個非空白頁有 OCR 結果或明確人工確認。
- 不以摘要字數或 LLM 回覆成功作為轉換證據。
- Agent 必須讀回實際 MD 檔，不只相信轉檔命令 exit 0。

### 6.4 PDF Agent 資源上限

PDF 前置流程雖不在外掛 runtime，仍是推薦路徑的一部分，必須 fail closed：

| 項目 | Ceiling |
|---|---:|
| PDF source bytes | 100 MiB |
| pages | 1,000 |
| indirect objects | 1,000,000 |
| decoded streams total | 500 MiB |
| 單頁 raster／OCR pixels | 40 megapixels |
| 全文件 raster／OCR pixels | 200 megapixels |
| 單頁 OCR wall-clock | 60 seconds |
| 全文件 extract＋OCR wall-clock | 600 seconds |
| converter／OCR peak RSS over baseline | 1 GiB |

Agent 必須使用可終止的本機 process，超限／timeout／取消後刪除不完整 MD 與 OCR temp，不把 partial 結果標為完成。PDF page count、object count、decoded stream bytes 與 pixel budget 在 decode 前可預知時先阻擋，串流期間持續累計。

---

## 7. 使用者流程與資訊架構

### 7.0 Client 與 Job 前置條件

新格式不提供繞過安全架構的 Quick Flow。合法順序固定為：

1. Welcome／Client Manager／Job Dashboard 與既有全域導覽維持 v1.0。
2. 使用者解鎖既有 Client 或建立新 Client。
3. 建立 `contentVersion = 1.1.0` 的單一來源 Job，取得 JRK 與 `tokenAuthKey`。
4. 進入該 Job 的 source-selection step，才顯示「選擇檔案」。
5. 完成 inventory、detection、dictionary、review、Token／Mapping、Shadow artifact、Residual、Export Guard 與 Safe Package。

Client 未解鎖、Job 未建立、Secure Store 不可寫、JRK 不可用或已有另一 writer 時，選檔與輸出都停用。

### 7.1 選擇文件

在已解鎖 Client、已建立 Job 的 source-selection step 內，只提供一個主要操作：

- 主按鈕：「選擇檔案」
- 檔案右鍵：「用 Hans SafeDoc 建立安全副本」

選檔器只允許目前已放行格式。未放行格式仍可顯示，但不可選取或必須立即說明原因。

選取後主畫面只顯示：

- 檔名
- 格式
- 大小
- 「原始檔不會被修改」
- 檢查範圍摘要

完整來源路徑收在「檔案資訊」，不得與輸出路徑並列造成混淆。

### 7.2 格式檢查

掃描敏感內容前先做格式 preflight：

- 格式與副檔名是否一致
- 是否加密或有密碼保護
- 是否有巨集、外部連線、嵌入物件或未支援結構
- 估算壓縮後／解壓後大小與資源限制
- 列出可掃描 surface 數量
- 列出需人工確認的媒體或無法掃描區域

若不能完整處理，顯示：發生什麼事、是否建立副本、下一步。不得只顯示內部錯誤碼。

### 7.3 安全內容檢查

預覽不是 Word／Excel 版面預覽，固定顯示：

> 這裡只顯示要檢查的文字與儲存格。正式格式請用原本的程式開啟安全副本確認。

DOCX locator 顯示例：

- 正文，第 4 段
- 表格 2，第 3 列第 1 欄
- 頁首 1
- 註腳 3
- 超連結網址

XLSX locator 顯示例：

- 工作表「客服名單」，B12
- 隱藏工作表「舊資料」，C8
- 儲存格註解，D4
- 超連結，E9

所有來源、預覽、路徑與 Token 只用純文字 DOM／`textContent`／text nodes，禁止 Markdown renderer、`innerHTML`、外部資源與 Obsidian URI。

### 7.4 人工確認

- 每筆顯示原文、變更後內容、locator 與必要前後文。
- 文字按鈕使用「安全代碼化」與「保留原文，不取代」。
- 保留原文時明確警告安全副本仍會包含該資料。
- 批次接受降為次要操作，需摘要與二次確認。
- 圖片等未自動掃描內容不得批次接受。
- 仍有未確認、未支援或 active-content blocker 時，「建立安全副本」停用並列出全部原因。

以下結構欄位不依賴自動偵測，固定進入人工檢查清單：

- 原始檔名
- Office 作者、公司、最後修改者等文件屬性
- DOCX 註解作者
- XLSX 工作表名稱與 defined names
- 所有 external hyperlink／relationship target

在客戶字典或人名辨識尚未完整可用時，固定人工檢查是 release blocker，不得因 detector 沒產生 candidate 就略過。

### 7.5 完成狀態

完成頁的主要操作保持精簡，但不得隱藏風險狀態：

1. 無保留原文、accepted residual 或人工媒體確認時顯示「安全副本已建立」。若存在任一項，改顯示「安全副本已建立，仍有你確認保留的內容」，並置頂列出三類計數與不可忽略警告。
2. 「原始檔未修改」
3. 主要按鈕：
   - 全格式：「用預設應用程式開啟檢查副本」
4. 次要按鈕：「顯示輸出位置」「複製檔案位置」
5. 收合區：「查看處理詳情」「查看完整路徑與安全提醒」

完成後不得繼續顯示大量審核按鈕。retained-original、accepted-residual、manual-media-review 警告不得收合或只用顏色表示。

---

## 8. 架構總覽

```text
Obsidian UI
→ Client Unlock
→ v1.1 Single-source Job Creation / JRK / tokenAuthKey
→ Source Selection
→ Format Probe
→ ReadOnly Source Adapter
→ Format Inventory
→ Extraction Manifest
→ Core Detection / Dictionary / Review / Tokenization
→ Format-local Rewrite Plan
→ Output Staging
→ Format Adapter Rewrite
→ Independent Reopen Validation
→ Format-aware Residual Scan
→ Artifact Hash / Structure Validation
→ Journaled Mapping / Occurrence / Audit Transaction
→ Safe Package Export Guard
→ Atomic Publish outside Vault
→ EXPORTED
→ Completion UI / Verified Inspection Copy Open
```

Core detection、dictionary、review、token authenticity 與 mapping encryption 維持平台無關。格式處理不得把 Obsidian／Electron 依賴帶進 Core detection。

---

## 9. Format Adapter 契約

概念介面：

```ts
interface FormatAdapter {
  readonly id: 'txt' | 'csv' | 'docx' | 'xlsx';
  readonly version: string;

  probe(source: ReadOnlySource): Promise<FormatProbeResult>;
  inventory(source: ReadOnlySource): Promise<FormatInventory>;
  extract(source: ReadOnlySource, inventory: FormatInventory): Promise<ExtractionManifest>;
  planRewrite(
    source: ReadOnlySource,
    manifest: ExtractionManifest,
    decisions: ReviewedReplacement[],
  ): Promise<RewritePlan>;
  rewrite(source: ReadOnlySource, plan: RewritePlan, stagingPath: string): Promise<Artifact>;
  reopenAndVerify(artifact: Artifact, expected: VerificationManifest): Promise<VerificationResult>;
  scanResiduals(artifact: Artifact, oracle: DecisionAwareResidualOracle): Promise<ResidualResult>;
}
```

### 9.1 ReadOnlySource

來源介面只能提供：

- `readBytes()`
- `stat()`
- `realpath()`
- `sha256()`

不得暴露：

- write
- modify
- rename
- delete
- move

### 9.2 ExtractionManifest

每個可掃描 surface 至少包含：

- `documentId`
- `format`
- `adapterId`
- `adapterVersion`
- `surfaceId`
- `surfaceKind`
- `logicalLocator`
- `containerPart`
- `sourceText`
- `sourceTextSha256`
- `rewritePolicy`
- `visibility`
- `relationships`
- `unsupportedFlags`

Manifest hash 與來源 snapshot 一起綁定審核決策。

Core candidate 的 `start`／`end` 繼續使用該 `sourceText` 內的 JavaScript UTF-16 code unit offset，`end` 為 exclusive。OOXML part、run、sheet、cell 與 raw byte 位置由 format locator 另外保存，不得拿 XML byte offset 取代 Core offset。

ExtractionManifest 含有原始文字，屬敏感資料：

- 處理中的 manifest 只能存在記憶體，或以 Job Key 認證加密後存入 Vault 外 Secure Store。
- 未加密 manifest、source text、logical locator 與原始檔名不得寫入 Vault、輸出 staging、Safe Package、Audit、log、錯誤報告或 `data.json`。
- 非敏感狀態只能保存 manifest SHA-256、surface counts、adapter ID／version 與不含原文的 blocker codes。
- Client lock、Job switch、取消、view close、plugin unload 後，必須清除記憶體中的 manifest、thumbnail object URLs 與衍生 preview。

### 9.3 RewritePlan

RewritePlan 必須：

- 由 extraction locator 產生，不由 UI 預覽內容產生。
- 驗證來源 bytes、surface hash、adapter version 與 manifest hash。
- 只允許修改已審核 span 或完整儲存格文字。
- 列出將保留、修改、阻擋、人工確認的 container parts。
- 不包含明文 Mapping、Key 或不必要原文。

### 9.4 Independent Reopen

正式 artifact 必須由獨立 parser 路徑重新開啟。只用同一個 serializer 回傳成功不算驗證。

重新開啟必須確認：

- 容器可解析
- 必要 parts 存在
- 關聯無斷裂
- 非目標內容結構未意外消失
- 所有正式 Token byte-for-byte 完整
- 原始 canary 不存在於所有承諾支援的 surface
- 沒有新增 active content

### 9.5 v1.1 Locator 與 offset 契約

所有 v1.1 occurrence record 必須包含 `formatLocatorV11` tagged union，不是可選欄位。共同規則：

- `logicalStartUtf16`／`logicalEndUtf16` 是未正規化 `sourceText` 內的 JavaScript UTF-16 code unit，end exclusive。
- `sourceTextSha256 = SHA-256(UTF-8(sourceText))`，不得先 NFC／NFKC、換行統一或 trim。
- Adapter 必須提供 logical ↔ container 的雙向映射及映射 hash；重新開檔後以該映射驗證 occurrence。
- 重疊候選先沿用 v1.0 PB-CAND 規則解決；RewritePlan 仍有 overlap 時阻擋，不靠替換順序猜測。
- replacement 不得跨越不可改寫 boundary；遇到 tab、break、field instruction、cell boundary、relationship boundary 或 parser 無法映射區域即阻擋。

```ts
type FormatLocatorV11 = { sourceSurfaceHashSha256: string } & FormatLocatorBodyV11;

type FormatLocatorBodyV11 =
  | { kind: 'txt'; rawByteStart: number; rawByteEnd: number; logicalStartUtf16: number; logicalEndUtf16: number; segmentId: string; mapSha256: string }
  | { kind: 'csv-field'; rowIndex0: number; columnIndex0: number; rawFieldByteStart: number; rawFieldByteEnd: number; rawContentByteStart: number; rawContentByteEnd: number; decodedStartUtf16: number; decodedEndUtf16: number; quoteState: 'quoted' | 'plain'; mapSha256: string }
  | { kind: 'docx-text'; partName: string; blockPath: string; runSlices: Array<{ childPath: string; startUtf16: number; endUtf16: number }>; logicalStartUtf16: number; logicalEndUtf16: number; mapSha256: string }
  | { kind: 'xlsx-cell-text'; sheetRelId: string; cellRef: string; valueKind: 'shared' | 'inline'; richTextSlices?: Array<{ run: number; startUtf16: number; endUtf16: number }>; logicalStartUtf16: number; logicalEndUtf16: number; mapSha256: string }
  | { kind: 'xlsx-raw-value'; partName: string; sheetRelId: string; cellRef: string; elementQName: 'x:v'; startUtf16: number; endUtf16: number; mapSha256: string }
  | { kind: 'xlsx-display-value'; partName: string; sheetRelId: string; cellRef: string; rawValueHashSha256: string; numberFormatId: number; displayStartUtf16: number; displayEndUtf16: number; mapSha256: string }
  | { kind: 'xlsx-formula'; partName: string; sheetRelId: string; cellRef: string; formulaKind: 'normal' | 'shared-master' | 'shared-follower' | 'array' | 'data-table'; elementQName: 'x:f'; startUtf16: number; endUtf16: number; mapSha256: string }
  | { kind: 'xlsx-cached-result'; partName: string; sheetRelId: string; cellRef: string; elementQName: 'x:v'; startUtf16: number; endUtf16: number; mapSha256: string }
  | { kind: 'ooxml-element-text'; package: 'docx' | 'xlsx'; partName: string; canonicalElementPath: string; elementQName: string; textNodeIndex: number; startUtf16: number; endUtf16: number; mapSha256: string }
  | { kind: 'ooxml-attribute-value'; package: 'docx' | 'xlsx'; partName: string; canonicalElementPath: string; elementQName: string; attributeQName: string; startUtf16: number; endUtf16: number; mapSha256: string }
  | { kind: 'ooxml-property'; package: 'docx' | 'xlsx'; partName: string; propertyQName: string; occurrenceIndex0: number; logicalStartUtf16: number; logicalEndUtf16: number; mapSha256: string }
  | { kind: 'comment-author'; package: 'docx'; partName: string; commentId: string; logicalStartUtf16: number; logicalEndUtf16: number; mapSha256: string }
  | { kind: 'relationship-target'; package: 'docx' | 'xlsx'; relsPartName: string; relationshipId: string; targetMode: 'Internal' | 'External'; logicalStartUtf16: number; logicalEndUtf16: number; mapSha256: string }
  | { kind: 'xlsx-sheet-name'; sheetIndex0: number; sheetRelId: string; logicalStartUtf16: number; logicalEndUtf16: number; mapSha256: string }
  | { kind: 'xlsx-defined-name'; definedNameIndex0: number; localSheetId?: number; logicalStartUtf16: number; logicalEndUtf16: number; mapSha256: string }
  | { kind: 'xlsx-table-name'; partName: string; tableId: number; attribute: 'name' | 'displayName'; logicalStartUtf16: number; logicalEndUtf16: number; mapSha256: string };

type ArtifactLocatorV11 = FormatLocatorV11 & {
  artifactLogicalStartUtf16: number;
  artifactLogicalEndUtf16: number;
  artifactSurfaceSha256: string;
  sourceToOutputMapSha256: string;
};
```

CSV row／column為 0-based。`rawFieldByteStart`／`rawFieldByteEnd` 包含外層 quotes，`rawContentByteStart`／`rawContentByteEnd` 不含外層 quotes，所有 end exclusive。

每個 locator 的 `sourceSurfaceHashSha256` 綁定完整 logical surface。`canonicalElementPath` 由 canonical part root 起算，以 namespace URI＋local name＋同 QName sibling 0-based index 組成；attribute 以 namespace URI＋local name 唯一定位。Reopen 時先重建 canonical path，再驗 surface hash、QName、occurrence、mapping hash 與 UTF-16 span，任一不符即失效。

DOCX `blockPath`／`childPath` 不是依賴可選的原生 ID，而是以 part root 起算、只計同 QName siblings 的 0-based canonical path，例如 `/w:document[0]/w:body[0]/w:p[3]/w:r[1]/w:t[0]`。Prefix 先轉成固定 namespace URI token；屬性排序不影響 path。重新開檔必須產生相同 path，否則 blocker。

每個 replacement 依來源 `logicalStartUtf16` 升冪建立 prefix-sum delta map。對未被替換 occurrence：`artifactStart = sourceStart + sum(delta of replacements ending <= sourceStart)`；若 occurrence 與 replacement overlap，只有同一 TOKENIZED decision 可映射，其他情況阻擋。重複原文以 structural locator＋occurrence-level fingerprint 區分，fingerprint 固定為 `SHA-256(locator canonical JSON || original value UTF-8 || 32 UTF-16 units before || 32 UTF-16 units after)`。同一 surface 混合 TOKENIZED／RETAINED 時，每筆各自產生 `ArtifactLocatorV11`，不得用整個 sourceText hash 代替 occurrence 證據。

逐格式 rewrite 規則：

- TXT：BOM 不屬於 logical text；CRLF 以兩個 UTF-16 units 保留；由 UTF-8 decoder 產生精確 byte map，只改 raw byte span。
- CSV：surface 是完整 decoded field；`""`、quoted newline 與 escape 映射必須可逆。只重編碼目標 field，prefix／suffix、整列其他 bytes 與原方言不變。
- DOCX：跨 runs replacement 保留第一個字元所在 run 的 style；第一／最後 run 的未選 prefix／suffix 不變；中間被覆蓋文字清空。跨 `w:tab`、`w:br`、`w:instrText`、field、SDT data binding 或不明節點時阻擋。
- XLSX：shared string 必須 clone 後只改目標 cell；rich-text replacement 保留第一個字元所在 run style 與兩端 prefix／suffix。整格 number-display 轉 Token 時記錄原 cell type／style，不能把 display offset 當 raw value offset。

Golden corpus 必須涵蓋 emoji、surrogate pair、combining mark、重複原文、XML entity、quoted newline、escaped quote、跨 run 中段、rich text、尾端 occurrence 與 overlap blocker。

---

## 10. Source Snapshot 與 TOCTOU

每個 Job snapshot 包含：

- realpath 的安全指紋，不寫入 Safe Package
- source SHA-256
- size
- mtime
- format
- adapter ID／version
- extraction manifest SHA-256
- inventory SHA-256

至少在以下時點重驗：

1. 掃描完成後
2. 產生 RewritePlan 前
3. 寫入 staging 前
4. 原子發布前

失效 scope 固定為目前 v1.1 單一來源 Job：

- SHA-256 改變、adapter version 改變、inventory／manifest hash 改變：該文件全部 review decisions 與受影響 Entity decisions 失效，Job 依 PB-JOB-004 回到 `SCANNING` 並重掃。
- size 改變必然重新算 SHA-256，按上條處理。
- 只有 mtime／inode metadata 改變但 bytes SHA-256 相同：不使內容決策失效；更新 snapshot 前寫入不含路徑的 Audit event，並再次執行 preflight。
- 既有 v1.0 Markdown 多文件 Job 仍依 PB-JOB-004 只使變更文件與受影響 Entity 失效，不套用本節單一來源 scope。

取消／lock／close／unload 必須清除 plaintext buffers、DOM、object URLs、staging 與未提交 mutation；已認證加密的 Mapping、Job result、Audit 與 checkpoint 依 v1.0 PB-TXN-004 保留，不得因 UI 取消而刪除。

來源 bytes 在處理前後必須維持相同 SHA-256 與 size。mtime 依上述 byte-equal 規則處理；來源 bytes 改變視為 P0。

---

## 11. TXT 契約

### 11.1 支援

- UTF-8
- UTF-8 BOM
- LF
- CRLF
- 無尾端換行
- 一般 Unicode 與 surrogate pair

### 11.2 阻擋

- 無效 UTF-8
- UTF-16
- Big5
- 混合編碼
- NUL bytes
- C0 controls，僅 U+0009 TAB、U+000A LF、U+000D CR 例外
- U+007F、C1 U+0080–U+009F
- bidi override／isolate U+202A–U+202E、U+2066–U+2069
- U+2028 LINE SEPARATOR、U+2029 PARAGRAPH SEPARATOR

U+200B ZERO WIDTH SPACE、U+200C ZWNJ、U+200D ZWJ、U+2060 WORD JOINER 與非檔首 U+FEFF 不直接遺失或正規化，固定顯示 code point 與前後文並逐項人工確認；未確認時阻擋。BOM 只允許位於 byte 0。

不得猜測或自動轉碼。介面要求使用者先以原程式另存 UTF-8。

### 11.3 輸出

- 對原始 bytes 做最小替換。
- 保留 BOM、換行、尾端換行與所有未修改 bytes。
- 輸出副檔名仍為 `.txt`。

---

## 12. CSV 契約

### 12.1 第一版允許方言

- UTF-8／UTF-8 BOM
- 分隔符：逗號、Tab、分號
- 引號：雙引號
- 跳脫：雙引號重複
- LF／CRLF
- quoted newline
- 空欄位與尾端空欄
- 欄數不一致時可預覽但預設阻擋，需使用者先修復來源

系統必須用逗號、Tab、分號三種 parser 做確定性判斷；只有唯一一種結果能維持完整列數、固定欄數與合法引號時，才可自動採用並繼續掃描。多種結果同時合理或無法形成穩定欄位時，必須以白話預覽要求使用者選擇；不得使用 LLM 猜測，也不得在模糊狀態直接輸出。

### 12.2 預覽

- 主預覽顯示簡化表格。
- 同時顯示列數、最大欄數、方言、編碼、預覽筆數與完整總數。
- 不因只顯示前 N 列而只掃描前 N 列。

### 12.3 Rewrite

- 優先對原始 raw field span 做局部替換，不重新序列化整份 CSV。
- 保留原分隔符、引號、換行、BOM、空欄與欄位順序。
- Token 需要引號時，只調整該欄位，不重寫整列。

### 12.4 CSV active-content Gate

Predicate 對完整 decoded logical field 執行，不看截斷 preview：

1. 保留原值不修改，另建立只供判斷的 NFKC probe。
2. 從 probe 開頭移除 Unicode whitespace、U+0009、U+000A、U+000D、NBSP、U+FEFF、U+200B／200C／200D／2060 與 C0／C1 controls。
3. 第一個字元為 `=`、`+`、`@` 時一律 `CSV_ACTIVE_CONTENT`。
4. 第一個字元為 `-`、U+2212 或其他 NFKC 後的減號時，只有整欄符合 `^-?(0|[1-9][0-9]*)(\.[0-9]+)?$` 才視為數字；其餘阻擋。
5. 任何清除前導字元後的 Excel／LibreOffice formula／DDE fixture 均必須阻擋。

- 不自動修改公式。
- 未處理時禁止輸出。
- 使用者須回原始文件轉為純文字或排除文件。
- 不能因 Hans SafeDoc 沒新增公式就忽略既有公式注入風險。

---

## 13. DOCX 契約

### 13.1 支援容器

只接受副檔名、MIME、OOXML Content Types 一致的 `.docx`。

首版文字 surface：

- `word/document.xml`
- 表格內文字
- headers／footers
- footnotes／endnotes
- comments 與 comment author metadata
- hyperlinks 與 relationship target
- document core／app properties 中的文字 metadata
- 一般段落／表格／註解中的文字；DrawingML text／文字方塊第一版阻擋
- 檔名安全檢查

### 13.2 Run mapping

敏感字串可能跨多個 `w:r`／`w:t`。Adapter 必須建立 logical paragraph text 與 run map：

- detection 對 logical text 執行
- rewrite 回到對應 runs
- 保留第一個被修改 run 的樣式作為 Token 樣式
- 清空其餘被覆蓋 run 文字，但不得刪除未涵蓋結構
- 處理 XML escaping 與 `xml:space="preserve"`

不得使用 `indexOf()` 回找原文。

### 13.3 Package closure 與 allowlist

DOCX closure 分兩層。第一層讓每個 package part／relationship 進入唯一 allowlist；第二層再分類允許 XML part 內的 surfaces。不得把 part 與 surface 混在同一守恆式。

OOXML closure 的三份機械正本為：`HANS-SAFEDOC-V1.1-OOXML-ALLOWLIST.csv`（part／Content Type）、`HANS-SAFEDOC-V1.1-OOXML-RELATIONSHIPS.csv`（source→target／Type／Mode／cardinality）、`HANS-SAFEDOC-V1.1-OOXML-SURFACES.csv`（namespace URI／QName／attribute／surface class／locator kind）。任何沒有精確列入三份正本的 part、edge、QName 或 attribute 一律 REJECT；`[Content_Types].xml` 只允許正本列出的 Overrides，以及實際使用的 `.rels`、`.xml`、`.png`、`.jpg`／`.jpeg` Defaults。

```text
total parts = allowed_xml + allowed_media + reject
total relationships = allowed_internal + allowed_external_hyperlink + reject
```

只接受 OOXML Transitional namespace。第一版 part allowlist：

| Part class | 精確 part-name pattern | Cardinality／政策 |
|---|---|---|
| `ALLOWED_CONTROL` | `[Content_Types].xml` | exactly 1 |
| `ALLOWED_PROPERTIES` | `docProps/core.xml`、`docProps/app.xml`、`docProps/custom.xml` | 每種 0..1，所有文字 surface 掃描 |
| `ALLOWED_MAIN` | `word/document.xml` | exactly 1 |
| `ALLOWED_TEXT_PART` | `word/headerN.xml`、`footerN.xml`、`footnotes.xml`、`endnotes.xml`、`comments.xml` | header/footer 0..N，其餘每種 0..1 |
| `ALLOWED_STRUCTURE` | `word/styles.xml`、`word/settings.xml`、`word/fontTable.xml`、`word/numbering.xml`、`word/theme/theme1.xml` | 每種 0..1；QName／attribute 必須落在 Surface 正本，theme／font display names 走 `SCAN_BLOCK` |
| `ALLOWED_RELS` | `_rels/.rels`、`word/_rels/document.xml.rels`、每個允許 header／footer／notes part 的同名 `.rels` | 只能包含下列 relationship allowlist |
| `ALLOWED_MEDIA` | `word/media/<opaque>.png`、`.jpg`、`.jpeg` | 0..200，internal image relationship，逐張人工確認 |
| `REJECT` | 任何未列 part，包括額外 theme、`customXml/*`、glossary、embeddings、ActiveX、VBA、signature、altChunk、VML、SVG／EMF／WMF | fail closed |

Relationship Type 必須等於 `http://schemas.openxmlformats.org/officeDocument/2006/relationships/` 加以下 suffix：`officeDocument`、`styles`、`settings`、`fontTable`、`numbering`、`header`、`footer`、`footnotes`、`endnotes`、`comments`、`image`、`hyperlink`、`theme`；另允許 package core-properties、extended-properties、custom-properties 的官方 URI。除 `hyperlink` 可為 External 且必須進人工檢查外，其餘一律 Internal。所有其他 External relationships 都 REJECT。

允許 XML part 內 surface policy：

| Surface class | Surface | 政策 |
|---|---|---|
| `SCAN_REWRITE` | `w:t` 一般／hidden text、comments text、properties value、hyperlink display text | 完整 locator、rewrite、reopen、residual；hidden 狀態顯示給使用者 |
| `SCAN_BLOCK` | `w:instrText`／field code、style／numbering／theme／font display names、comment author、relationship target、simple content-control metadata | 掃描並人工確認；有 candidate 或無法證明安全時阻擋，不自動改結構值 |
| `MANUAL_REVIEW` | allowlisted PNG／JPEG | 逐 image hash 確認，不做 OCR |
| `REJECT` | tracked change、deleted revision、`mc:AlternateContent`、DrawingML text／text box、data-bound content control、unknown QName／namespace | fail closed |

簡單 content control 只有在無 `w:dataBinding`、所有文字都落在已映射 runs 時才可 `SCAN_REWRITE`。每個 input／output part、relationship 與 surface class 的 count 必須守恆。

本節三份正本中的 `N` 是不含前導零的正整數 `[1-9][0-9]*`；`{a|b|c}` 是有限集合，不是 regex；`<opaque>` 是不含 path separator 的單一安全檔名；`<source>` 只展開為 allowlisted document／headerN／footerN／footnotes／endnotes／comments part。所有 path 比對先做 OPC normalization，大小寫敏感。

### 13.4 第一版阻擋條件

- tracked changes／revision history
- password-protected／encrypted package
- `.docm` 或 VBA
- embedded OLE／embedded package
- external template／external relationship
- custom XML／unknown OOXML part
- DrawingML text／文字方塊
- ActiveX
- digital signature，因改寫後簽章必然失效
- 損壞或 Office 要求修復的 package

### 13.5 圖片

首版不做 OCR。PNG／JPEG 可保留，但每張圖片必須：

- 顯示本機 thumbnail
- 記錄 image hash、尺寸與所在位置
- 逐張人工選擇「不含敏感資料」或「排除整份文件」
- 禁止批次接受

SVG、EMF、WMF、linked image 或未知影像格式預設阻擋。

完成頁固定標示圖片由人工確認，未經自動文字辨識。任何未確認圖片阻止輸出。

### 13.6 格式承諾

- 保留 DOCX 容器、樣式、表格、圖片及未修改關聯。
- Token 長度可能造成換行、表格增高、頁數與分頁改變。
- 不承諾 Word／LibreOffice 渲染像素一致。

---

## 14. XLSX 契約

### 14.1 支援容器

只接受副檔名、MIME、OOXML Content Types 一致的 `.xlsx`。

首版文字 surface：

- workbook metadata
- 工作表名稱
- visible、hidden、veryHidden sheets
- visible 與 hidden rows／columns
- shared strings
- inline strings
- 文字與數字儲存格的 raw value 與 display format
- hyperlinks 與 relationship target
- defined names
- core／app properties
- 檔名安全檢查

### 14.2 儲存格定位

每個 surface 使用：

- workbook document ID
- sheet stable ID
- sheet name for display only
- cell address
- cell type
- style ID
- shared string index 或 inline locator
- formula／cached result flag

審核不得只綁定可變的工作表顯示名稱。

### 14.3 Shared strings

修改共享字串時不得直接覆寫原 index，避免其他儲存格一起改變。

Adapter 必須：

- 為被修改儲存格建立新的 shared string 或安全 inline string
- 只更新目標 cell reference
- 驗證未選取儲存格的 logical value 不變

### 14.4 數字與格式

手機、證號等可能以 number＋number format 顯示。偵測需同時取得：

- raw cell value
- calculated display text
- style／number format

若安全代碼化，儲存格改為文字值但保留安全可保留的 style。介面必須告知該儲存格資料型別會從數字變文字。

### 14.5 公式

- 第一版拒絕所有含公式的 XLSX，不區分 replacement count。
- Inventory 發現 formula element、shared／array／data-table formula、structured／external workbook reference、DDE、WEBSERVICE、動態資料函式、formula extension、cached formula result 或 calcChain，立即在 preflight 阻擋。
- Hans SafeDoc 不解析、改寫或清除公式／cache，不改 calculation mode，不要求 Excel 重算，也不以 Excel／LibreOffice 結果作安全 oracle。
- 每個公式文字與 cached result 仍須產生 `xlsx-formula`／`xlsx-cached-result` locator，作為 blocker evidence；不建立 artifact。

Native Excel／LibreOffice 開啟只用 formula-free inspection copy 做相容性測試，不是發布前 residual oracle，不改變權威 artifact hash。含 `calcChain`、formula cache 或 calculation dependency 的文件沒有第一版合格路徑。

### 14.6 Package closure 與 allowlist

XLSX closure 同樣分成 package part／relationship allowlist與 part 內 surface policy：

XLSX 同樣以三份 OOXML CSV 為機械正本。Relationship edge 必須同時符合 source pattern、target pattern、完整 Type URI、TargetMode 與 cardinality；XML node 必須符合完整 Transitional namespace URI、QName、attribute、node kind 與 surface class。任何 mismatch 一律 REJECT。

```text
total parts = allowed_control + allowed_properties + allowed_workbook + allowed_sheet + allowed_structure + reject
total relationships = allowed_internal + allowed_external_hyperlink + reject
```

只接受 OOXML Transitional namespace。第一版 part allowlist：

| Part class | 精確 part-name pattern | Cardinality／政策 |
|---|---|---|
| `ALLOWED_CONTROL` | `[Content_Types].xml`、`_rels/.rels` | 各 exactly 1 |
| `ALLOWED_PROPERTIES` | `docProps/core.xml`、`docProps/app.xml`、`docProps/custom.xml` | 每種 0..1，所有文字掃描 |
| `ALLOWED_WORKBOOK` | `xl/workbook.xml`、`xl/_rels/workbook.xml.rels` | 各 exactly 1 |
| `ALLOWED_SHEET` | `xl/worksheets/sheetN.xml`、對應 `xl/worksheets/_rels/sheetN.xml.rels` | sheet 1..100；rels 0..1 per sheet |
| `ALLOWED_STRUCTURE` | `xl/styles.xml`、`xl/sharedStrings.xml`、`xl/theme/theme1.xml` | 每種 0..1；QName／attribute 必須落在 Surface 正本，theme／font display names 走 `SCAN_BLOCK` |
| `ALLOWED_TABLE` | `xl/tables/tableN.xml` | 0..N，只由 sheet internal table relationship 引用；名稱 surface 走 SCAN_BLOCK |
| `REJECT` | 任何未列 part，包括額外 theme、comments、threaded comments、persons、VML、drawings、media、charts、printerSettings、externalLinks、connections、queryTables、pivot、embeddings、customXml、VBA、ActiveX、signature | fail closed |

Relationship Type 必須等於 `http://schemas.openxmlformats.org/officeDocument/2006/relationships/` 加以下 suffix：`officeDocument`、`worksheet`、`styles`、`sharedStrings`、`table`、`hyperlink`、`theme`；另允許 package core-properties、extended-properties、custom-properties 的官方 Transitional URI。除 `hyperlink` 可為 External 且必須進人工檢查外，其餘一律 Internal。Target 必須落在對應 allowlisted part；unknown Type、錯方向、錯 cardinality、dangling 或未使用 part 一律阻擋。

允許 XML part 內 surface policy：

| Surface class | Surface | 政策 |
|---|---|---|
| `SCAN_REWRITE` | shared／inline strings、非公式 cell value／display text、properties value、hyperlink display text | 完整 locator、rewrite、reopen、residual |
| `SCAN_BLOCK` | sheet name、defined name、table name／displayName、theme／font display names、relationship target | 固定人工確認；無法映射時阻擋 |
| `PRESERVE_VALIDATED` | workbook／style／theme 結構 | input／output byte hash 與 graph 驗證 |
| `REJECT` | formula、cached result、calcChain、DDE、external reference、dynamic-data function、`mc:AlternateContent`、unknown QName／namespace、comments、drawing／chart／media surface | fail closed |

任何 part／relationship 未進入唯一 allowlist class，任何允許 part 內 surface 未進入唯一 surface class，或 input／output counts、Content Types、relationship graph 無法守恆，均阻止輸出。

本節三份正本中的 `N` 是不含前導零的正整數 `[1-9][0-9]*`；`{a|b|c}` 是有限集合，不是 regex；`<opaque>` 是不含 path separator 的單一安全檔名；`<source>` 只展開為 allowlisted document／headerN／footerN／footnotes／endnotes／comments part。所有 path 比對先做 OPC normalization，大小寫敏感。

### 14.7 第一版阻擋條件

- `.xlsm`、VBA、ActiveX
- password-protected／encrypted workbook
- external data connections
- Power Query
- pivot cache／pivot table
- external workbook links
- embedded OLE／embedded package
- digital signature
- 損壞或 Excel 要求修復的 package
- drawing、chart、text box、printerSettings 或其他未納入 allowlist 的 part

圖片、comments／notes、drawing、chart、text box、VML 與 linked image 在 XLSX 第一版全部阻擋，沒有人工接受分支。

### 14.8 格式承諾

- 保留 formula-free 工作表、style、欄寬、列高、合併儲存格與未修改的 allowlisted 物件。
- 被代碼化儲存格可能改為文字型別，排序行為可能因此改變，必須在預覽揭露。
- 第一版不發布任何有公式依賴風險的文件，因此不得用「可能影響公式」警告取代 blocker。

---

## 15. 檔名、路徑與輸出位置

1. 來源可能位於 Vault 內或由使用者明確選取的本機檔案。
2. 來源永遠唯讀。
3. 正式輸出位於 Vault 外、Secure Store 外、非同步與非網路掛載的核准本機路徑。
4. 新預設根目錄可顯示為 `Hans SafeDoc Outputs`，但既有 `Privacy Bridge Outputs` 不自動搬移、刪除或改名。
5. 原始檔名若含待處理資料，不得沿用到輸出。
6. 安全檔名格式：

```text
HSD-<FORMAT>-<SEQUENCE>.<extension>
```

7. 若原檔名通過安全檢查，可在 UI 內顯示，但輸出仍優先使用 opaque safe filename。
8. 同名輸出自動建立新 sequence，永不覆寫。
9. Safe Package、Mapping 或 Audit 不得包含原始絕對路徑。

---

## 16. Staging、原子發布與完成條件

### 16.1 狀態路由

v1.1 不新增 Job state，合法轉換沿用 PB-JOB-003：

```text
DRAFT → INVENTORY_REQUIRED → SCANNING → REVIEW_REQUIRED
→ READY_TO_BUILD → BUILDING_SHADOW → RESIDUAL_REVIEW
→ READY_TO_EXPORT → EXPORTED
```

- `INVENTORY_REQUIRED`：執行 format probe、封閉式 inventory、resource limits。
- `SCANNING`：建立 ExtractionManifest、locator map、candidates。
- `REVIEW_REQUIRED`：完成 detector candidates、固定人工 surfaces、媒體與保留原文決策。
- `BUILDING_SHADOW`：在 staging 產生同格式安全 artifact，不發布。
- `RESIDUAL_REVIEW`：獨立 reopen、decision-aware residual、Token／structure verification。
- `READY_TO_EXPORT`：artifact 已驗證，但尚未對使用者宣稱完成。
- `EXPORTED`：PB-EXPORT-003／004／005 的完整 Safe Package、package hash、Audit transaction 均通過後才可進入。

### 16.2 Journaled two-phase transaction

同一 Job 受 PB-JOB-005 單一寫入者保護。Transaction 固定順序：

1. 建立 authenticated encrypted transaction journal，phase=`PREPARING`，記錄 transaction ID、source／manifest／rewrite hashes 與預期 artifact ID，不含原文或絕對路徑。
2. 在核准輸出根目錄的不可見 generation path `.hsd-transactions/<transaction-id>/` 建立 package staging。POSIX 使用 mode `0700`；Windows 使用 current-user-only ACL。該實體路徑就是 immutable package generation，不做跨檔案系統 final rename。
3. 在 Secure Store 寫入未啟用的 pending generation，包含 Mapping、occurrence、review 與待提交 Audit payload；所有 v1.1 occurrence 必含 source／artifact locators。
4. 複製原容器，在 `BUILDING_SHADOW` 依 RewritePlan 局部改寫。
5. fsync／close，獨立 reopen，執行 decision-aware residual、Token authenticity、structure／relationship／artifact hash 驗證。
6. 再驗 source snapshot。若變更，rollback pending generation 與 package generation，Job 回 `SCANNING`。
7. 在不可見 generation path 建立完整 Safe Package，納入同格式 Shadow artifact、non-sensitive Inventory、Review Summary、Residual Report、Manifest、Package Hash 與 v1.0 規定項目；不得包含 Mapping、Key、原文、原始容器或絕對路徑。
8. 執行 `PB-EXPORT-PRECOMMIT`：驗證 PB-EXPORT-003／004／005 中除「Audit transaction committed」與最終 Job state 外的全部條件。失敗則完整 rollback。
9. 將 Audit transaction 以 generation ID 與 package hash committed，journal phase=`AUDIT_COMMITTED`；pending Mapping 尚未對一般 reader active。若後續 rollback，追加 authenticated compensating Audit，不刪除歷史 Audit。
10. 對不可見 package、committed Audit 與 pending secure generation 執行完整 PB-EXPORT-003／004／005 final gate。
11. 在 Secure Store 單一 transaction 中切換 active generation pointer、把 Job 從 `READY_TO_EXPORT` 設為 `EXPORTED`，journal phase=`SECURE_COMMITTED`。
12. 讀回 active Mapping、Job state、Audit 與 immutable package，交叉驗證 package hash、artifact hash、Token authenticity 與 occurrence count。
13. 只有第 12 步成功，UI 才登錄／暴露 opaque artifact ID、顯示完成頁與允許建立 inspection copy。不可見 generation path 在此之前不是使用者可操作輸出。

Crash recovery：

- `PREPARING`：刪除 package generation、rollback pending secure generation，回到前一安全狀態。
- `AUDIT_COMMITTED` 但尚未 `SECURE_COMMITTED`：若 final gate 可重現則完成 secure commit；否則追加 compensating Audit、刪除 package generation、rollback pending generation。
- `SECURE_COMMITTED` 但 UI 尚未暴露：重新執行第 12 步；成功才暴露，失敗則用 previous-generation pointer 回復並進 `FAILED`。
- package、journal、Audit 或 secure generation 任一無法認證：不得猜測完成，Job 進 `FAILED`，保留加密 recovery evidence。
- 每一 phase 的可觀察狀態都不得出現 UI 可用但 Mapping／Audit／package generation 不一致的 artifact。

任一步失敗不得修改來源或既有完整輸出。

---

## 17. Format-aware Residual Scan

Residual Scan 必須重新打開正式 artifact，而不是掃 preview string。

Decision-aware residual oracle 必須逐 occurrence 保存：`entityId`、Token、來源指紋、decision、允許保留原因、輸出 locator、artifact surface hash。分類固定為：

- `TOKENIZED_EXPECTED`：原文必須為 0，完整 Token 必須存在於預期 locator。
- `RETAINED_EXPLICIT`：只有使用者逐項明確保留且 reopen 後 locator／source fingerprint 相符時允許；必須計入完成頁警告。
- `MANUAL_MEDIA_ACCEPTED`：只適用已逐項確認的 PNG／JPEG hash，不能豁免其他文字 residual。
- `UNEXPECTED_RESIDUAL`：任何未對應 occurrence、unknown part、錯誤 locator、漏改或新出現候選，全部阻止輸出。

- TXT：掃完整 decoded text。
- CSV：掃每個 raw／logical field，含隱藏在 quoted newline 的內容。
- DOCX：掃所有已承諾 XML parts、metadata、hyperlinks、comments 與人工確認清單。
- XLSX：掃所有 sheets、hidden content、shared／inline strings、hyperlinks、formula text、cached results 與 metadata；comments／drawing 等第一版在 inventory 直接阻擋。
- OOXML 必須對全部解壓 entry 做 inventory，並以格式邏輯重建跨 XML run／shared string 的 logical text 後掃描。解壓 entry bytes 的 canary scan 是額外防線，不得用 raw grep 取代格式解析；任何一層仍出現 canary 都必須失敗。

只有 `TOKENIZED_EXPECTED` 驗證成功與明確的 `RETAINED_EXPLICIT`／`MANUAL_MEDIA_ACCEPTED` 可進入 READY_TO_EXPORT。任何 `UNEXPECTED_RESIDUAL` 不得發布。

---

## 18. 開啟安全副本

### 18.1 權威 artifact 與 inspection copy

Safe Package 內的權威 artifact 維持不可變。Native Open 不直接開啟權威 artifact，而是在核准輸出根目錄建立同 hash 的 opaque inspection copy，避免 Word／Excel／LibreOffice AutoSave 破壞已驗證 package。

Inspection copy 建立契約：

1. 目錄必須 current-user-only，realpath 位於核准根目錄，父鏈不得含 symlink、junction 或 Windows reparse point。
2. 名稱使用至少 128-bit CSPRNG opaque ID；POSIX 以 `O_CREAT|O_EXCL|O_NOFOLLOW`，Windows 使用等價 create-new／reparse rejection，禁止覆寫既有 path。
3. 從權威 artifact 的已驗證 file handle 複製，fsync／close 後重開，驗證 extension、content type、size 與 SHA-256 全部相同。
4. 交給 OS handler 的最後一刻再次 lstat／realpath／reparse／size／SHA-256。目錄權限或任一值改變就停止。
5. Threat model 防止誤操作、其他 OS 帳號與不受信任／同步路徑置換。已取得同一使用者帳號權限的惡意程序可在最後 hash 與 pathname open 間競態置換，明確不在 v1.1 保證範圍；產品不得宣稱已消除此風險。若未來納入 same-user adversary，必須先提供 verified handle→trusted broker 的平台方案，否則 Native Open 為 No-Go。

按鈕固定寫「用預設應用程式開啟檢查副本」，不承諾指定 Word 或 Excel。Native Open 只能接受目前 `EXPORTED` Job 的 opaque artifact ID。

開啟前重新驗證：

- artifact ID 存在於目前 `EXPORTED` Job
- realpath 位於核准輸出根目錄
- extension 與 content type 一致
- SHA-256 與完成紀錄一致
- source／staging 路徑不可被開啟
- 無 active-content blocker

使用 Electron／OS 安全 API 傳入獨立 path argument，不組 shell command、不解析自訂 URI。macOS 與 Windows 都只呼叫預設 handler；不提供任意 application path。

File watcher 只用於快速顯示提示，不作安全證據。每次 reopen、顯示可分享路徑或複製路徑前都強制重算 inspection hash；不同即標為 `EXTERNALLY_MODIFIED_UNVERIFIED`，不得再稱為已驗證安全副本。再次分享前必須重新匯入、重掃與建立新的 Safe Package。權威 artifact hash 不受影響。

若原生程式不存在：

- 不宣稱開啟成功
- 顯示「已建立安全副本，但找不到可開啟此格式的程式」
- 保留「顯示輸出位置」與「複製檔案位置」

---

## 19. 資源與惡意輸入防線

以下是 v1.1 normative ceiling，所有條件同時套用，任一超限即 `HSD-LIMIT-5xx`。Phase 0 benchmark 可提出降低或正式 spec 修訂，不得在 code 中自行放寬：

| 項目 | Ceiling |
|---|---:|
| TXT／CSV source bytes | 50 MiB |
| DOCX／XLSX compressed bytes | 25 MiB |
| OOXML expanded total | 250 MiB |
| ZIP entries | 10,000 |
| ZIP expansion ratio | 20× |
| 單一 XML part | 25 MiB |
| XML element depth | 64 |
| XML attributes per element | 128 |
| 全容器 XML nodes | 2,000,000 |
| 單一 XML text node | 1 MiB |
| 全文件 logical text | 100 MiB |
| 單一 logical surface | 5 MiB |
| TXT detector segment | 1 MiB UTF-16 text |
| CSV 單一 decoded field | 5 MiB UTF-16 text |
| XLSX worksheets | 100 |
| XLSX non-empty cells | 90,000 |
| XLSX shared-string entries | 500,000 |
| DOCX／XLSX PNG／JPEG count | 200 |
| 單張 image decoded pixels | 40 megapixels |
| 全文件 image decoded pixels | 100 megapixels |
| review candidates | 50,000 |
| extraction surfaces | 100,000 |
| 單階段 wall-clock timeout | 120 seconds |
| parser／rewrite peak RSS over baseline | 512 MiB |
| PDF extracted text／MD output | 100 MiB |
| PDF OCR temp | 1 GiB per Job |
| PDF total temp／partial output | 2 GiB per Job |
| format staging generation | 500 MiB per Job |
| Safe Package generation | 500 MiB per Job |
| inspection copies | 500 MiB per Job；5 GiB global |
| all active temp／staging | 2 GiB global |
| retained Hans SafeDoc outputs | 10 GiB global；超限只阻擋新輸出，不自動刪除 |
| concurrent processing Jobs | 1 |
| parser／OCR workers | 2 total |

TXT 按 1 MiB detector segments 串流，但 overlap 固定為 `min(4096 UTF-16 units, max enabled detector/dictionary term length)`，且跨 segment candidate 必須去重。任何啟用的 detector／dictionary term 超過 4096 UTF-16 units 時阻擋該 Job，不以切段漏掃。CSV 以完整 decoded field 為 surface，不跨 field 偵測；超過 5 MiB 的 field 阻擋，不截斷掃描。

Timeout 從每階段真正開始計時，不含使用者停留審核時間；超時會可復原地取消，不發布 artifact。記憶體以啟動該階段前穩定 baseline 對比 process peak RSS。

硬規則：

- ZIP entry 做 OPC normalization，拒絕 absolute path、`..`、symlink、duplicate normalized name、Unicode／case-fold collision、重疊 local entry ranges、重複／歧義 EOCD、central-directory 與 local-header name／method／size／CRC mismatch。
- 禁止 XML external entity 與 DTD。
- XML 深度、attributes、nodes、字串、expanded bytes、圖片 pixels、候選與總配置量全部在 allocation／decode 前檢查可預知部分，串流過程持續累計。
- 超過 300 ms 顯示階段、完成／總數與可取消狀態。
- 不顯示不可靠的剩餘時間。
- 取消後清除 plaintext buffers、preview、object URLs、staging 與未提交 mapping mutation；保留已認證加密 checkpoint。
- 任一 bytes／disk／worker／Job quota 超限，原子關閉 handle 並刪除本 Job 的 partial MD、OCR temp、staging、inspection copy 與未 commit generation；不得刪除既有已完成 artifact。
- 不使用 `child_process`。
- parsing 不得長時間阻塞 Obsidian UI；採可中斷 worker 或 cooperative yielding，具體方案需由 spike 證明可打包且通過 CSP／security scan。

---

## 20. 相依套件政策

任何 TXT／CSV／ZIP／OOXML 套件必須先通過：

- MIT／ISC／BSD／Apache-2.0 allowlist
- 無 runtime network
- 無 telemetry
- 無動態下載
- 無 native binary postinstall，除非另經明確審查與跨平台 Gate
- bundle 可掃描
- 支援 zip-slip／zip-bomb limits
- parser 可關閉 external entity／external relationship fetch
- SBOM 與 lockfile 完整
- 維護狀態與安全公告盤點

不得因某函式庫能快速輸出 DOCX／XLSX，就接受整份有損重新序列化。

---

## 21. 相容性矩陣

每種格式正式發布前至少驗證：

- macOS fresh Obsidian profile
- Windows fresh Obsidian profile
- Microsoft Word／Excel 的支援版本，版本在 release candidate 時凍結
- LibreOffice 代表性版本
- Microsoft Office 建立的 fixture
- Google Docs／Sheets 匯出的 fixture
- LibreOffice 建立的 fixture
- 中文檔名、Unicode、emoji、combining mark
- 窄側欄 360／420／480 px
- keyboard-only
- VoiceOver／Narrator

相容矩陣必須標示「可開啟」「無修復提示」「格式差異」「公式差異」「阻擋原因」。

---

## 22. 錯誤分類與新手文案

| Code family | 類型 | 使用者文案格式 |
|---|---|---|
| HSD-FMT-1xx | 不支援格式／容器不符 | 這個檔案目前不支援，因此尚未建立安全副本。請另存為指定格式後再試。 |
| HSD-ENC-1xx | 編碼 | 這個文字檔不是支援的 UTF-8，因此尚未建立安全副本。請先另存為 UTF-8。 |
| HSD-OFFICE-2xx | 巨集、修訂、嵌入、外部連線 | 文件含有目前無法完整檢查的內容，因此尚未建立安全副本。 |
| HSD-SOURCE-3xx | 來源變更／消失／權限 | 原始檔在檢查期間已變更，請重新掃描。沒有建立副本。 |
| HSD-VERIFY-4xx | 重開、結構、Residual、Token 驗證 | 安全副本驗證未通過，因此沒有發布。原始檔未修改。 |
| HSD-LIMIT-5xx | 大小、ZIP、XML、時間 | 文件超過目前安全處理範圍，因此沒有建立副本。 |
| HSD-OPEN-6xx | 原生程式／檔案被移動 | 安全副本已建立，但目前無法開啟。請使用「顯示輸出位置」。 |

錯誤訊息必須回答：發生什麼事、是否產生副本、下一步。不得在 Notice、log 或安全摘要顯示原文、完整來源路徑或完整 Token。

---

## 23. 資料契約版本策略

### 23.1 Store namespace 與 migration matrix

v1.0 schemas 與 Job directories 不修改、不搬移、不原地升級。v1.1 Client／Job 寫入 Secure Store 下獨立、舊版不會列舉的 sibling namespace `v11/clients/<v11-client-id>/`，不得放在任何 v1.0 Client／Job 目錄之內；v1.0 binary 只認既有路徑，因此其 recursive delete 無法觸及 v1.1 Job 或 key。

v1.1 不重用 v1.0 `client.key` 作為可恢復性的唯一根。第一次為某個 Client 建立 v1.1 Job 時，產生獨立 CSPRNG v1.1 CRK，寫入 authenticated `client-v11.key`，以使用者當次解鎖憑證依 PB-CRYPTO 規則獨立包裝。v1.1 JRK 只由 v1.1 CRK 包裝。v1.0 刪除 `client.key`、v1.0 Job 或 v1.0 Client index 都不能刪除、覆寫或使 `client-v11.key` 失效。

v1.1 UI 必須把同 display Client 的 v1.0／v1.1 key stores 視為一個刪除集合；只有 v1.1 plugin 可執行完整刪除。降級 v1.0 時，v11 namespace 不可見但仍可恢復。若使用者要求徹底刪除 v1.1 資料，必須升回 v1.1，由 PB-DELETE 確認後同時 cryptographic erase `client-v11.key` 與 v11 Jobs。

| Reader／Writer | v1.0 Job | v1.1 Job |
|---|---|---|
| v1.0 plugin | 沿用 frozen read／write | 不列舉、不開啟、不寫入 |
| v1.1 plugin | 走 v1.0 code path，無 migration | 使用獨立 `client-v11.key`；單一來源、單一格式 |
| v1.1 → downgrade v1.0 | v1.0 Job 照常可用 | v1.1 Job 留在獨立 namespace，不可見、不降級寫回 |
| v1.1 rollback／recovery | 使用 v1.0 frozen transaction | 使用 v1.1 encrypted journal 與 recovery snapshot |

不允許 mixed-format Job，也不允許把 v1.0 Job in-place 改為 v1.1。若使用者想用新 adapter，建立新的 v1.1 Job；舊 Job 保持 byte-for-byte 歷史語義。

### 23.2 v1.1 schema／envelope／AAD

新增獨立 schema：

- `format-inventory-v1.1`
- `extraction-manifest-v1.1`
- `rewrite-plan-v1.1`
- `artifact-verification-v1.1`
- `media-review-v1.1`
- `format-occurrence-v1.1`
- `format-transaction-journal-v1.1`
- `format-job-index-v1.1`

全部使用 `additionalProperties: false`。格式 locator 是必填 tagged union。

Encrypted content AAD 固定包含既有 v1.0 AAD 欄位及下列值：

| contentSchema | contentVersion | 用途 |
|---|---|---|
| `pb-format-job` | `1.1.0` | v1.1 Job metadata／state |
| `pb-format-manifest` | `1.1.0` | encrypted ExtractionManifest／locator maps |
| `pb-format-mapping` | `1.1.0` | Mapping／occurrence／review decisions |
| `pb-format-journal` | `1.1.0` | two-phase transaction／recovery |

每個 envelope 另含 `clientId`、`jobId`、`contentId`、`format`、`adapterId`、`adapterVersion`；AAD mismatch 必須認證失敗。`minimumReaderVersion` 與 `minimumWriterVersion` 都固定 `1.1.0`，放在 v1.1 authenticated Job index，不放 v1.0 `data.json`。

### 23.3 Mapping、Backup、Delete、Result、Restore

- Token／Entity 去重、JRK、`tokenAuthKey` 演算法與 PB-TOKEN-001–006 完全沿用，但 v1.1 JRK 由獨立 v1.1 CRK 包裝。
- 每個 v1.1 occurrence 必填 `formatLocatorV11`、logical／container map hash、artifact output locator 與 decision-aware residual status。
- Client backup 必須把 `v11/` namespace、envelopes、journal、format Mapping 與必要 adapter version manifest 納入 authenticated encrypted backup；不得包含來源或明文 extraction。
- Delete／Archive 必須同時處理 v1.1 Job、inspection copies、staging 與 recovery records，並沿用 v1.0 cryptographic erasure 與 Audit 規則。
- Result Input 仍只允許 v1.0 定義的 JSON，不因 DOCX／XLSX 支援而接受任意 Office 檔作 Result Import。
- v1.1 不新增同格式 artifact restore，也不新增 restore state。Result Input 與 Restore 完整維持 v1.0 `EXPORTED → RESULT_IMPORTED → READY_TO_RESTORE → RESTORING → RESTORED`、Result JSON 與 Result Vault 契約。
- Safe Package 不包含原始容器、原始 path、Mapping、dictionary、JRK、extraction 原文或 locator plaintext。

---

## 24. Acceptance Matrix

機械正本包含兩份：

- `docs/HANS-SAFEDOC-V1.1-REQUIREMENTS.csv`：逐條 normative clause 的穩定 Clause ID、section、原文 SHA-256、Requirement IDs 與 clause text。
- `docs/HANS-SAFEDOC-V1.1-ACCEPTANCE-MATRIX.csv`：Requirement ID、適用格式、證據型態、test path、fixture、expected assertion 與 release blocker。
- `docs/HANS-SAFEDOC-V1.1-CLAUSE-COVERAGE.csv`：Clause ID 對應的 Requirement／Acceptance records 與 exact supplemental assertion。

每一條含「必須／不得／只有／一律／禁止／永遠／不允許／不可」或非目標「- 不」的 normative line 都必須存在 Clause Register；`source_line` 只供閱讀，身份由 Clause ID＋clause hash 決定。每條 clause 至少一筆 coverage record，`Clause ID＋Requirement ID` pair 必須唯一；coverage 的 `supplemental_assertion` 必須與 clause text 完全一致，並成為所指 Acceptance test 的必要 assertion。同一 clause 只有在兩個 Gate 都直接驗該句時才可有多筆明確 coverage，不得把整個 section 的 requirements 批次掛上。新增、刪除或改寫 normative line 卻未同步 register／coverage，section 不一致，或 coverage 指向不存在／不適用的 Requirement／Acceptance，一律阻止鎖定。

每個放行格式必須執行該格式列，以及 `Common`、`UX`、`Performance`、`Release` 全部 applicable rows。Traceability validator 必須證明零重複 ID、零 orphan clause／requirement、零 acceptance without section／test path、零 evidence-type mismatch、零未標示 release blocker。

Requirement ID 由 Acceptance ID 機械推導：`HSD-ACC-<GROUP>-<NNN>` 對應 `HSD-REQ-<GROUP>-<NNN>`。以下 register 規定每個 normative section 的唯一覆蓋集合；該 section 的每個「必須／不得／只有／一律」clause 都由集合內至少一個 requirement 的 expected assertion 驗收，validator 必須逐 clause 標記而非只接受 section 存在。

| Normative section | Requirement IDs |
|---|---|
| §1–2 權威、版本、品牌 | FND-001、FND-002、FND-011、REL-002 |
| §3–5 目標、非目標、能力矩陣 | FND-009、REL-002 |
| §6 PDF Agent | PDF-001–005 |
| §7 UX／Client／Job entry | UX-001–006、FND-004、FND-009 |
| §8 Architecture | FND-003、FND-005、FND-010 |
| §9 Adapter／locator／reopen | FND-003、FND-005、FND-013、FND-015、DOCX-001、XLSX-001 |
| §10 Snapshot／TOCTOU | FND-004、FND-006 |
| §11 TXT | TXT-001–005 |
| §12 CSV | CSV-001–006 |
| §13 DOCX | DOCX-001–011 |
| §14 XLSX | XLSX-001–011 |
| §15 filename／path／output | FND-017 |
| §16 transaction／export | FND-010、REL-001 |
| §17 residual | FND-013、FND-015 |
| §18 inspection／native open | FND-008、FND-016、UX-003、UX-006 |
| §19 resource limits | PERF-001、PDF-005 |
| §20 dependency policy | FND-007、REL-001 |
| §21 compatibility | UX-004–005、REL-001 |
| §22 errors／privacy copy | FND-018 |
| §23 schemas／migration／delete／restore | FND-011、FND-012、FND-014 |
| §24 traceability | REL-003 |
| §25–26 phase／DoD | FND-009、REL-001–003 |
| §27 review／lock status | REL-002、REL-003 |

| ID | Gate | Scenario | Expected |
|---|---|---|---|
| HSD-ACC-FND-001 | Common | v1.0 full CI／105 acceptance | 全綠，v1.1 不破壞既有 MD |
| HSD-ACC-FND-002 | Common | plugin display rename | UI 顯示 Hans SafeDoc；plugin ID、data、command、PB Token 相容 |
| HSD-ACC-FND-003 | Common | Source adapter API audit | 無 write／rename／delete；來源 hash、size、mtime 不變 |
| HSD-ACC-FND-004 | Common | Source changes at four recheck points | bytes 變更使目前單一來源文件與受影響 Entity 決策失效並回 SCANNING；mtime-only 且 hash 相同則保留決策並 Audit |
| HSD-ACC-FND-005 | Common | Preview tampered independently | 正式輸出不受 preview DOM／model 影響 |
| HSD-ACC-FND-006 | Common | Cancel／lock／close／unload | plaintext、preview、object URL、staging、未提交 mutation 清除；已認證加密 checkpoint 保留 |
| HSD-ACC-FND-007 | Common | Denied network runtime | 四格式完整流程零 socket attempt |
| HSD-ACC-FND-008 | Common | Artifact native open path attack | realpath／hash／extension 驗證阻擋越界與 stale artifact |
| HSD-ACC-FND-009 | Common | Base product Alpha Gates audit | 安全還原、客戶字典、正式 Residual、PB-PERF、跨平台、無障礙與獨立安全審查皆有新鮮證據；105 Acceptance 不作替代 |
| HSD-ACC-FND-010 | Common | crash at every two-phase transaction boundary | package／Mapping／Audit 原子恢復或一起 rollback，不出現可用但不可還原 artifact |
| HSD-ACC-FND-011 | Common | v1.0／v1.1 reader-writer matrix | v1.0 Job byte-identical；v1.0 plugin 不列舉 v11 namespace；AAD／minimum version mismatch 拒絕 |
| HSD-ACC-FND-012 | Common | v1.0 Result JSON／Result Vault restore regression | v1.1 不新增同格式 restore；既有合法狀態與還原行為 byte-compatible |
| HSD-ACC-FND-013 | Common | decision-aware residual | explicit retained／manual media 可追溯；漏改、unknown part、錯 locator 一律阻擋 |
| HSD-ACC-FND-014 | Common | v1.1 Job → downgrade v1.0 → delete v1.0 Client → upgrade v1.1 | 獨立 `client-v11.key` 仍可解密 v1.1 Job；v1.0 deletion 不破壞 v11；v1.1 才能完整刪除 |
| HSD-ACC-FND-015 | Common | mixed tokenized／retained／duplicate occurrences in one surface | source→artifact delta map、occurrence fingerprint 與 ArtifactLocatorV11 無 collision，逐筆 residual 可證明 |
| HSD-ACC-FND-016 | Common | inspection copy symlink／reparse／pre-open replacement | O_EXCL／no-follow／current-user-only／copy hash／last-moment hash 可偵測檢查前置換；同帳號惡意程序的檢查後 path race 明文不在 v1.1 保證範圍 |
| HSD-ACC-FND-017 | Common | safe filename／output path／collision | opaque filename、Vault／Secure Store／network root 拒絕、sequence 無覆寫、Safe Package 無絕對路徑 |
| HSD-ACC-FND-018 | Common | error／log／Notice privacy | 錯誤回答發生事項與下一步，但不顯示原文、完整 path、完整 Token 或 secrets |
| HSD-ACC-PDF-001 | PDF Agent | 文字型多頁 PDF → MD | 本機抽取，頁面覆蓋紀錄完整，PDF 不進 Vault |
| HSD-ACC-PDF-002 | PDF Agent | 掃描頁／空白頁混合 | OCR／人工確認逐頁閉環，未處理頁阻擋 |
| HSD-ACC-PDF-003 | PDF Agent | 嘗試線上轉檔／LLM 摘要 | 推薦流程拒絕，不標記完成 |
| HSD-ACC-PDF-004 | PDF Agent | Hans SafeDoc 選擇 Vault 外原始 MD | 原始 MD 不複製進 Vault；Vault 外完成掃描與安全輸出，只有安全 MD 可由使用者／Agent 匯入知識庫 |
| HSD-ACC-PDF-005 | PDF Agent | every PDF Agent resource boundary | bytes／pages／objects／streams／pixels／timeout／RSS boundary−1、boundary、boundary+1；超限清除 partial MD／OCR temp |
| HSD-ACC-TXT-001 | TXT | UTF-8 BOM＋CRLF＋no final newline | Token 正確，BOM／CRLF／尾端狀態保留 |
| HSD-ACC-TXT-002 | TXT | Big5／UTF-16／invalid UTF-8／NUL | 明確阻擋，無猜測轉碼、無輸出 |
| HSD-ACC-TXT-003 | TXT | emoji／combining／長單行 | span 正確，無 regex overflow，未修改 bytes 不變 |
| HSD-ACC-TXT-004 | TXT | reopen＋residual＋source hash | 全綠才發布 |
| HSD-ACC-TXT-005 | TXT | C0／C1／bidi／zero-width／non-leading BOM | 依 code-point policy 阻擋或逐項人工確認，無隱形正規化 |
| HSD-ACC-CSV-001 | CSV | comma／tab／semicolon fixtures | 使用者確認方言後欄列與 raw bytes 對應正確 |
| HSD-ACC-CSV-002 | CSV | quoted newline／escaped quote／empty tail | 欄位不位移，未修改列 byte-preserved |
| HSD-ACC-CSV-003 | CSV | inconsistent columns | 預設阻擋並說明，無有損自動修復 |
| HSD-ACC-CSV-004 | CSV | formula injection patterns | active content Gate 阻擋，不直接交 Excel |
| HSD-ACC-CSV-005 | CSV | large file limited preview | UI 顯示部分預覽，但完整文件被掃描與驗證 |
| HSD-ACC-CSV-006 | CSV | leading whitespace／controls／zero-width／fullwidth formula variants | canonical active-content predicate 在 Excel／LibreOffice fixtures 全部阻擋 |
| HSD-ACC-DOCX-001 | DOCX | 跨 runs 的手機／Email | logical extraction 與 run rewrite 精確，樣式保留 |
| HSD-ACC-DOCX-002 | DOCX | tables／headers／footers／notes／comments／links | 全部納入 inventory、preview、rewrite、residual |
| HSD-ACC-DOCX-003 | DOCX | tracked changes／deleted text | fail closed，原始 deleted text 不得進安全副本 |
| HSD-ACC-DOCX-004 | DOCX | macro／encrypted／OLE／external link／signature | 明確阻擋，無 artifact |
| HSD-ACC-DOCX-005 | DOCX | PNG／JPEG images | 每張逐項確認，任何 pending 阻止輸出 |
| HSD-ACC-DOCX-006 | DOCX | ZIP bomb／XXE／path traversal | 資源內快速拒絕，無越界寫入 |
| HSD-ACC-DOCX-007 | DOCX | independent reopen | Word／LibreOffice 無修復提示，必要 parts／relationships 完整 |
| HSD-ACC-DOCX-008 | DOCX | canary in hidden supported part or split across XML runs | 全 entry inventory、logical reconstruction、parser residual 抓到並阻止發布；raw grep 不作唯一證據 |
| HSD-ACC-DOCX-009 | DOCX | author／company／lastModifiedBy／comment author contains synthetic name | 即使 detector 無 candidate 仍固定進人工檢查，未確認阻止輸出 |
| HSD-ACC-DOCX-010 | DOCX | unknown part／relationship／AlternateContent／field／hidden style | entry 與 relationship 分類數量守恆；任何未分類項目阻擋 |
| HSD-ACC-DOCX-011 | DOCX | exact part／relationship allowlist plus mixed surfaces in one XML part | part closure 與 surface closure 分層守恆；numbering、properties、rels、media cardinality 全部可機械判定 |
| HSD-ACC-XLSX-001 | XLSX | shared string used by multiple cells | 只目標 cell 改變，其他 cells logical value 不變 |
| HSD-ACC-XLSX-002 | XLSX | inline strings／hidden／veryHidden／links | 全部納入 inventory、review、residual；comments 在 preflight 阻擋 |
| HSD-ACC-XLSX-003 | XLSX | formatted numeric phone | raw／display 雙路偵測，型別變更揭露 |
| HSD-ACC-XLSX-004 | XLSX | any formula／cached formula result | 不論是否有敏感 candidate 或 replacement，一律在 preflight 阻擋 |
| HSD-ACC-XLSX-005 | XLSX | DDE／WEBSERVICE／external reference／shared／array／data-table formula | 一律阻擋；不得靠 parser 推測、清 cache 或原生 Excel 重算放行 |
| HSD-ACC-XLSX-006 | XLSX | pivot／Power Query／external connection／macro | 明確阻擋，無 artifact |
| HSD-ACC-XLSX-007 | XLSX | image／drawing／chart／text box | 第一版全部 REJECT，無人工接受分支、無 artifact |
| HSD-ACC-XLSX-008 | XLSX | independent reopen | formula-free Excel／LibreOffice 無修復提示，styles／merges／widths／heights 完整 |
| HSD-ACC-XLSX-009 | XLSX | sheet name／defined name／author metadata contains synthetic name | 固定進人工檢查，未確認阻止輸出；不得因缺少人名偵測而略過 |
| HSD-ACC-XLSX-010 | XLSX | unknown part／relationship／cache／calcChain／chart／printerSettings | part／relationship／surface closure 成立；公式、cache、calcChain 與未列項目全部阻擋 |
| HSD-ACC-XLSX-011 | XLSX | formula workbook with zero replacements | 仍阻擋，產出具 formula／cache locator 的 blocker evidence，無 artifact、無 Native Open |
| HSD-ACC-UX-001 | UX | novice source selection | 保留 Welcome／Client／Dashboard；只在已解鎖 v1.1 Job 的 source-selection step 顯示一個主要選檔入口 |
| HSD-ACC-UX-002 | UX | simplified Office preview | 明確不是版面預覽，locator、coverage、pending count 可理解 |
| HSD-ACC-UX-003 | UX | post-export | 條件式風險警告置頂；用預設程式開啟 inspection copy，不改權威 artifact |
| HSD-ACC-UX-004 | UX | 360／420／480 px | 無水平溢位，touch target ≥44 px，按鈕不截字 |
| HSD-ACC-UX-005 | UX | keyboard／VoiceOver／Narrator | 全流程可操作，非色彩唯一，錯誤與 pending 可朗讀 |
| HSD-ACC-UX-006 | UX | no handler／wrong handler／external modification | 不宣稱指定 Word／Excel；錯誤可復原；改過 inspection copy 標示 unverified |
| HSD-ACC-PERF-001 | Performance | every resource／disk／concurrency／ZIP-ambiguity ceiling | 每條限制各自測 boundary−1、boundary、boundary+1；duplicate／case collision／overlap／central-local mismatch 阻擋；超限原子 cleanup |
| HSD-ACC-REL-001 | Release | artifact read-back／SBOM／license／network／secret scans | 全綠，bundle 與 installed hash 一致 |
| HSD-ACC-REL-002 | Release | per-format feature flag | 只有通過該格式全部列才顯示正式支援 |
| HSD-ACC-REL-003 | Release | v1.1 traceability validator | 零 orphan requirement、零缺 test path、零未標 release blocker |

---

## 25. 實作分期與 Go／No-Go

### Phase 0：規格與 feasibility spikes

輸出：

- v1.1 schemas 草案
- FormatAdapter spike
- TXT／CSV raw span spike
- DOCX run-map／minimal rewrite spike
- XLSX shared-string／cell-type spike
- parser dependency、license、network、bundle、ZIP 安全評估
- provisional resource limits benchmark

Go：每個 spike 產生可重開 artifact、來源 hash 不變、canary residual 為 0。  
No-Go：只能抽文字、靠整份重新序列化、無法完整 inventory 或必須放寬網路／來源唯讀。

### Phase 1：TXT

先用 v1.1 common adapter 契約完成 TXT，跑 v1.0 regression＋TXT 全 Gate。TXT 未發布前不開 CSV production code。

### Phase 2：CSV

完成方言確認、raw span rewrite、formula injection Gate、大型資料與 Excel／文字程式 read-back。

### Phase 3：DOCX

只啟用標準安全集合。Revision、macro、encryption、OLE、external relationship、unsupported image 等 blocker 必須先存在，才能開放正常 DOCX。

### Phase 4：XLSX

最後實作。Shared strings、hidden content、formula、cached result、external connection、pivot cache 與原生重算是 release blocker。

### Phase 5：新手教學、品牌與公開說明

- 顯示名稱改 Hans SafeDoc
- 首頁列精確支援格式與版本狀態
- PDF Agent pre-ingest 教學
- 可直接複製給 AI Agent 的繁中操作指令，明確保留人工審核 Gate，不把原始文件上傳雲端
- 不支援與阻擋原因
- 「保留格式但版面可能調整」揭露
- 可安裝 artifact、macOS／Windows fresh profile 與無障礙人工驗收

---

## 26. Definition of Done

一個格式只有全部成立才算完成：

- 規格與 schema 鎖定
- 黃金樣本涵蓋正常、混亂、惡意、損壞、邊界與跨平台來源
- TDD focused tests 通過
- v1.0 full CI／105 acceptance 無 regression
- format-specific acceptance 全通過
- source bytes、size、mtime 不變
- artifact 獨立重開
- format-aware residual resolved
- Token byte integrity 通過
- native app 無修復提示
- network／secret／license／SBOM／artifact read-back 通過
- installed Obsidian 真實流程通過
- macOS／Windows fresh profile 通過
- keyboard-only、VoiceOver／Narrator 通過
- 支援文件與 UI 能力矩陣一致
- README、首次引導、常駐教學與 AI Agent 指令共用同一份可執行支援矩陣
- 未放行格式沒有被產品宣稱支援

---

## 27. 審查裁決

Hans 已核准本規格方向與連續實作。狀態固定為 `1.1.0 LOCKED`。

第一個 substantive engineering action 不是直接加入四個 production 解析套件，而是 Phase 0 的隔離 feasibility spikes。Spike 只回答可行性與依賴選型，不直接成為 production code；Gate 通過後不再等待額外產品決策，直接以 TDD 依 TXT、CSV、DOCX、XLSX、教學與上架驗證順序完成。
