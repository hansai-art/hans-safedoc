# Privacy Bridge
## Product & Engineering Master Specification

**文件代號：** PB-MASTER  
**版本：** 1.0.0 LOCKED  
**狀態：** READY FOR IMPLEMENTATION  
**鎖定日期：** 2026-08-25  
**產品：** Privacy Bridge  
**Repository：** `privacy-bridge`  
**Obsidian Plugin ID：** `privacy-bridge`  
**授權：** MIT  
**發布階段：** GitHub Public Alpha  
**支援平台：** Obsidian Desktop on macOS and Windows；Linux best effort  
**主要語言：** 繁體中文；英文 fallback  
**文件擁有者：** Product Owner  
**實作擁有者：** Tech Lead  
**安全擁有者：** Security Reviewer  

---

# 0. 文件效力與執行規則

## PB-GOV-001　唯一最高規格

本文件是 Privacy Bridge v1.0 的唯一產品與工程主規格。工程師、AI Coding Agent、測試、Issue、Pull Request、程式碼註解與 README 都不得自行改變本文件已鎖定的行為。

規格優先順序固定為：

1. `docs/MASTER-SPEC.md`
2. `schemas/*.schema.json`
3. `docs/ACCEPTANCE-MATRIX.md`
4. `test-corpus/golden/*`
5. `docs/DECISION-REGISTER.md`
6. `docs/IMPLEMENTATION-PLAN.md`
7. GitHub Issue
8. 程式碼註解
9. 現有程式碼

若下層內容與上層衝突，以上層為準。

## PB-GOV-002　既有規則程式的定位

`reference/legacy-seed/taiwan-recognizers.v2.ts` 與其測試只作為：

- 臺灣格式規則的起始素材
- 回歸案例來源
- 歷史行為比較基線

它們不是最終 API、資料模型或規格來源。即使既有測試全部通過，只要與本文件衝突，仍必須依本文件重構。

## PB-GOV-003　無提問持續開發

文件鎖定後，工程師不得因以下事項等待產品負責人決策：

- 元件拆分
- 檔名與變數名
- UI 一般排列
- 使用哪個等價的無網路函式庫
- 測試資料夾配置
- 可逆且不影響資料契約的技術細節
- 可依本文件安全預設推導出的邊界案例

遇到未明確描述的情況，依序選擇：

1. 不外洩資料
2. 不破壞原始資料
3. 不允許錯誤還原
4. 保留可稽核性
5. 保持資料契約相容
6. 保持功能正確
7. 保持使用體驗
8. 保持效能
9. 減少程式碼與依賴

## PB-GOV-004　唯一 Release Stop 條件

只有以下四種情況可以阻擋 Release，但不得停止其他不受影響的開發：

- `STOP-01`：可能造成原始資料毀損
- `STOP-02`：可能造成原始資料、Mapping、字典、Passphrase 或金鑰外洩
- `STOP-03`：既有資料無法安全向前遷移
- `STOP-04`：必要平台 API 已不存在，且沒有安全替代方案

發生 Stop 時，Tech Lead 必須建立 blocker，內容固定包含：

- 問題
- 影響
- 最安全的預設方案
- 受影響 Requirement ID
- 受影響 Acceptance ID
- 可繼續開發的工作

不得只留下「請產品決定 A 或 B」。

## PB-GOV-005　變更控制

v1.0 Scope、Security Model、Data Contract 與 Release Gate 均已凍結。任何新增功能一律進入 `v1.1-backlog`。只有修正資安漏洞、資料毀損風險、規格矛盾或平台不可行性，才可提出 Change Request。

---

# 1. 產品定義

## PB-PRD-001　產品定位

Privacy Bridge 是安裝於 Obsidian Desktop 的本機可逆假名化與安全資料轉移外掛。

它讓使用者在本機：

1. 掃描 Markdown 知識庫中的敏感資料。
2. 以規則、客戶字典與人工審核確認候選。
3. 將可逆資料轉為 Job 範圍內的安全 Token。
4. 將 Secret 與不應上雲的資料阻擋或不可逆遮罩。
5. 建立不修改原始 Vault 的 Sanitized Shadow Vault。
6. 匯出不含原始值、Mapping、字典與金鑰的安全資料包。
7. 匯入外部分析產生的結構化 JSON。
8. 在本機驗證 Token 並還原可讀結果。

## PB-PRD-002　正式用語

對外只使用：

- 可逆假名化
- 安全代碼化
- 本機敏感資料處理
- Local pseudonymization
- Secure data transfer

不得宣稱：

- 完全匿名化
- 自動偵測保證完整
- 去識別後必然不屬於個資
- 規則分數等於準確率
- 完整流程完全離線，除非外部分析也在本機或內網

## PB-PRD-003　核心承諾

> 原始資料、Mapping、客戶字典、Passphrase 與解密金鑰不進入安全匯出資料包；假名化與還原都在本機完成。

## PB-PRD-004　目標使用者

- 企業知識管理人員
- AI 專案負責人
- 顧問與研究人員
- 法務、稽核與資安人員
- 使用 Obsidian 處理客戶文件的專業工作者
- 需要將資料交給外部模型分析，但不能直接提供真實身分資訊的團隊

## PB-PRD-005　主要任務

- 掃描單篇筆記、資料夾、Vault 或外部安全匯入資料夾
- 審核高、中、低風險候選
- 建立客戶專屬加密字典
- 合併跨文件的同一實體
- 產生穩定且不可跨 Job 關聯的 Token
- 建立 Shadow Vault
- 執行 Residual Scan
- 匯出 Safe Package
- 驗證 Result Package
- 本機還原結果
- 保留不含明文的 Audit Trail

---

# 2. v1.0 範圍

## PB-SCOPE-001　必做

v1.0 必須完成完整閉環：

```text
建立 Client
→ 建立 Job
→ 選擇來源
→ 檔案盤點
→ 本機掃描
→ 字典匹配
→ 候選審核
→ Entity 合併
→ Tokenize／Redact／Block
→ Shadow Vault
→ Residual Scan
→ Export Guard
→ Safe Package
→ Result JSON 驗證
→ 本機還原
→ Result Vault
→ Audit／Archive／Backup
```

## PB-SCOPE-002　支援資料

v1.0 只正式支援 UTF-8 Markdown：

- `.md`
- YAML frontmatter
- Markdown body
- Markdown table
- Wikilink
- Alias
- Tag
- HTML comment
- Inline code
- Fenced code block
- 檔名
- 資料夾名稱

## PB-SCOPE-003　不支援資料

v1.0 不解析：

- PDF
- 圖片
- 音訊
- 影片
- Office 文件
- Canvas
- Bases
- 壓縮檔
- 資料庫檔
- 其他二進位附件

這些檔案不得默默忽略。它們必須進入 `UNSUPPORTED_PENDING_EXCLUSION` 清單；使用者明確批次排除後，Job 才能繼續。

## PB-SCOPE-004　v1.0 非目標

- 不內建雲端 API
- 不自動上傳或下載
- 不儲存任何雲端 API Key
- 不做 Telemetry
- 不做背景更新
- 不在背景或未經使用者明確選擇時下載模型
- 不使用遠端 NER
- 不內建 LLM 或大型模型；選用小型本機 NER 與外掛分開安裝，只增加人工審核候選
- 不支援 Obsidian Mobile
- 不修改原始 Vault
- 不承諾法律認證
- 不進行物理層安全抹除
- 不提交 Obsidian 官方目錄，直到 Alpha Release Gate 全部通過

---

# 3. 安全邊界與信任模型

## PB-SEC-001　可信區

可信區包含：

- 原始 Vault 或外部安全匯入資料夾
- Privacy Bridge Core
- Vault Adapter
- Secure Store
- 解鎖後的記憶體金鑰
- 加密 Mapping、字典與 Audit
- Shadow Vault 建置程序
- 本機 Result Restore

## PB-SEC-002　不可信區

一律視為不可信：

- 雲端 AI 或外部分析服務
- Safe Package 離開本機後的所有環境
- 下載回來的 Result JSON
- 外部檔名、路徑與文字
- 其他 Obsidian Community Plugin
- npm 相依套件
- 被同步或備份的路徑
- 使用者匯入的字典與備份檔

## PB-SEC-003　Obsidian 權限邊界

Privacy Bridge 無法阻止其他已安裝的 Obsidian 外掛讀取同一個原始 Vault。README 與首次啟動必須清楚提示企業使用者：

- 使用專用 Vault
- 使用專用 Obsidian Profile
- 僅啟用允許清單中的外掛
- 關閉 Obsidian Sync
- 關閉公有雲自動備份
- 高風險案件使用專用工作站

## PB-SEC-004　Fail Closed

以下情況一律阻擋匯出或還原：

- Secure Store 未解鎖
- Mapping 驗證失敗
- 有未審核候選
- 有未處理 Block 項目
- 有未明確排除的不支援檔案
- 原始檔案在掃描後變更
- Shadow Vault 建置不完整
- Residual Scan 有未處理結果
- Manifest 或檔案 Hash 不一致
- Result Schema 不符
- Job ID 不符
- Token 驗證失敗
- 未知 Token
- 跨 Job Token
- 路徑穿越
- 交易 Journal 未完成且尚未復原

---

# 4. 平台與 Repository

## PB-ENG-001　技術棧

- TypeScript strict
- pnpm workspace
- Monorepo
- esbuild
- Vitest
- fast-check
- ESLint
- Prettier
- JSON Schema Draft 2020-12
- Node.js `crypto`
- GitHub Actions
- 無執行期網路相依

## PB-ENG-002　Repository 結構

```text
privacy-bridge/
├── packages/
│   ├── core/
│   ├── obsidian-plugin/
│   └── schemas/
├── docs/
├── test-corpus/
├── examples/
├── scripts/
├── .github/
├── SECURITY.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## PB-ENG-003　Core 邊界

Core 不得依賴：

- Obsidian API
- Electron UI
- Node `fs`
- 全域 `app`
- 網路 API

Core 只能透過注入介面取得：

- Document
- Clock
- Random bytes
- Hash／Crypto adapter
- Persistence adapter

## PB-ENG-004　Desktop Only

外掛需使用 Vault 外檔案與 Node.js Crypto，因此 Manifest 必須設定 Desktop Only。Mobile 不提供降級模式。

## PB-ENG-005　Plugin 設定資料

Vault 內的 `.obsidian/plugins/privacy-bridge/data.json` 只能保存非敏感 UI 偏好：

- UI 語言
- Panel 寬度
- 是否預設展開低分候選
- Review 顯示密度

不得保存：

- Secure Store 路徑
- Client ID
- Job ID
- 原始路徑
- Operator Alias
- 字典
- Mapping
- Token
- Passphrase
- 金鑰

所有安全設定存於 Vault 外 Secure Store。

---

# 5. Secure Store 與 Client 模型

## PB-STORE-001　預設位置

```text
macOS:
~/Library/Application Support/privacy-bridge/

Windows:
%APPDATA%\privacy-bridge\

Linux best effort:
$XDG_DATA_HOME/privacy-bridge/
```

使用者可以選擇其他本機路徑，但不得位於：

- 原始 Vault
- Shadow Vault
- Result Vault
- 匯出資料夾
- 已知同步目錄
- 網路掛載磁碟

偵測到已知同步或網路路徑時，v1 直接拒絕，不提供忽略警告繼續。

## PB-STORE-002　目錄契約

```text
privacy-bridge/
├── store.json
└── clients/
    └── <client-id>/
        ├── client.key
        ├── client.enc
        ├── dictionary.enc
        ├── audit.enc
        └── jobs/
            └── <job-id>/
                ├── job.key
                ├── job.enc
                ├── detection.enc
                ├── review.enc
                ├── mapping.enc
                ├── occurrences.enc
                ├── path-map.enc
                ├── transaction.journal.enc
                ├── lock.json
                └── recovery/
```

## PB-STORE-003　Client

Client 是最上層安全隔離單位：

- 每個 Client 有獨立 Client Root Key
- 每個 Client 有獨立 Passphrase
- 每個 Job 有獨立 Job Root Key
- Job Root Key 由 Client Root Key 包裝
- 不同 Client 不共享字典、金鑰或 Entity
- 未指定客戶時建立一個獨立 Client，不使用全域共用 Client

## PB-STORE-004　Operator 身分

首次建立 Client 時必填：

- `operatorAlias`：使用者自行輸入的顯示名稱
- `deviceId`：Secure Store 產生的 UUIDv4

不得自動讀取：

- OS 帳號
- 電腦名稱
- Email
- Git identity
- Obsidian Sync 帳號

Operator Alias 加密保存於 `client.enc`。Audit 只保存 Alias 的 keyed fingerprint 與 opaque deviceId。

## PB-STORE-005　Auto Lock

- 預設 15 分鐘沒有敏感操作即鎖定
- Job 切換時鎖定上一個 Client
- Obsidian 關閉時清除記憶體金鑰
- 系統睡眠或使用者切換後立即鎖定
- 不提供永久記住 Passphrase
- 不將 Derived Key 放入剪貼簿、Log 或 Crash Report

---

# 6. 密碼學規格

## PB-CRYPTO-001　Client Root Key

建立 Client 時：

1. 產生 32 bytes CSPRNG Client Root Key，簡稱 `CRK`
2. 產生 16 bytes 隨機 Salt
3. 以使用者 Passphrase 經 scrypt 衍生 32 bytes KEK
4. 使用 AES-256-GCM 包裝 CRK
5. 寫入 `client.key`
6. 立即清除暫存 Passphrase bytes 與 KEK

## PB-CRYPTO-002　固定 scrypt 參數

```text
N = 131072
r = 8
p = 1
dkLen = 32 bytes
salt = 16 random bytes
maxmem = 268435456 bytes
```

使用 async API，不得在 UI 主執行緒同步阻塞。

Passphrase：

- 最少 12 個 Unicode code points
- 最多 256 個 Unicode code points
- 不做 Unicode normalization
- 不強迫大小寫、數字或符號組合
- UI 建議 16 個以上字元的 passphrase
- 連續失敗 5 次後，該 Client 解鎖延遲 30 秒
- 失敗次數只保存在記憶體，不建立可造成永久鎖死的磁碟狀態

## PB-CRYPTO-003　Job Root Key

建立 Job 時：

1. 產生獨立 32 bytes CSPRNG Job Root Key，簡稱 `JRK`
2. 使用 CRK 衍生的 Job Wrap Key 包裝 JRK
3. 寫入 `job.key`
4. 所有 Job 資料金鑰由 JRK 經 HKDF-SHA-256 domain separation 衍生

固定 HKDF info：

```text
PB/v1/job-wrap
PB/v1/job-data
PB/v1/token-auth
PB/v1/audit-chain
PB/v1/package-auth
PB/v1/canonical-fingerprint
```

HKDF Salt：

```text
SHA-256(UTF8("PrivacyBridge|1|" + clientId + "|" + jobId))
```

## PB-CRYPTO-004　資料加密

- Cipher：AES-256-GCM
- IV：每次加密重新產生 12 bytes CSPRNG
- Authentication Tag：16 bytes
- IV 絕對不得重用
- Ciphertext、IV、Salt、Tag 使用 Base64url、無 padding
- AAD 使用固定 canonical UTF-8：

```text
PBENC1\0<storeId>\0<clientId>\0<jobId-or-empty>\0<contentSchema>\0<contentVersion>\0<recordType>
```

## PB-CRYPTO-005　Token 驗證

Token Tag 使用 HMAC-SHA-256：

```text
payload = "PB|1|" + jobId + "|" + entityType + "|" + randomEntityId
tag = first 12 bytes of HMAC(tokenAuthKey, UTF8(payload))
```

12 bytes 以 Crockford Base32 編碼為 20 字元。

## PB-CRYPTO-006　密碼變更

修改 Client Passphrase只重新包裝 CRK：

- 不重新加密所有 Job 資料
- 舊 `client.key` 先備份為 transaction temp
- 新 key 驗證成功後原子替換
- 失敗時保留舊 key
- 不同時保留兩個 active key

## PB-CRYPTO-007　測試向量

`examples/crypto-test-vectors.json` 是跨平台一致性基準。任何更換 Crypto Provider 的 PR 必須產生相同測試結果。

---

# 7. Job 與狀態機

## PB-JOB-001　Job ID

格式：

```text
PB-YYYYMMDD-XXXXXXXXXX
```

`X` 使用 Crockford Base32，10 字元，CSPRNG 產生。

## PB-JOB-002　狀態

```text
DRAFT
INVENTORY_REQUIRED
SCANNING
REVIEW_REQUIRED
READY_TO_BUILD
BUILDING_SHADOW
RESIDUAL_REVIEW
READY_TO_EXPORT
EXPORTED
RESULT_IMPORTED
READY_TO_RESTORE
RESTORING
RESTORED
ARCHIVED
BLOCKED
FAILED
```

## PB-JOB-003　合法轉換

```text
DRAFT → INVENTORY_REQUIRED
INVENTORY_REQUIRED → SCANNING
SCANNING → REVIEW_REQUIRED
REVIEW_REQUIRED → READY_TO_BUILD
READY_TO_BUILD → BUILDING_SHADOW
BUILDING_SHADOW → RESIDUAL_REVIEW
RESIDUAL_REVIEW → READY_TO_EXPORT
READY_TO_EXPORT → EXPORTED
EXPORTED → RESULT_IMPORTED
RESULT_IMPORTED → READY_TO_RESTORE
READY_TO_RESTORE → RESTORING
RESTORING → RESTORED
RESTORED → ARCHIVED
```

任何狀態可進入 `BLOCKED` 或 `FAILED`。只有完成對應修復流程後才能回到前一個安全狀態。

## PB-JOB-004　來源變更

掃描前為每個來源檔建立：

- Document ID
- Relative Path
- File Size
- Last Modified Time
- SHA-256
- Encoding
- BOM 狀態
- Line Ending

在 Shadow Build 前重新計算 Hash。若任一檔案變更：

- 該文件所有 Candidate 與 Review Decision 標記為 stale
- Job 回到 `SCANNING`
- 只重掃變更文件
- 重新計算跨文件 Entity 群組
- 未受影響文件的人工決策可保留，但任何合併到變更 Entity 的決策必須重新確認

## PB-JOB-005　單一寫入者

同一 Job 同時間只能有一個會改寫 Secure Store 或產生輸出的操作。使用 `lock.json`、Heartbeat 與 encrypted transaction journal 控制。

---

# 8. 來源檔案盤點

## PB-FILE-001　來源模式

- Active Note
- Selected Folder
- Whole Vault
- External Folder

## PB-FILE-002　固定系統排除

以下路徑自動排除並寫入 inventory log，不需要使用者確認：

- `.obsidian/`
- `.trash/`
- `.git/`
- Secure Store
- Shadow Vault
- Result Vault
- Privacy Bridge staging directories
- OS metadata files such as `.DS_Store` and `Thumbs.db`

## PB-FILE-003　Hidden Markdown

除固定系統排除外，隱藏資料夾中的 `.md` 仍納入掃描，避免使用者誤以為已處理全部資料。

## PB-FILE-004　Symlink 與 Junction

- 不跟隨 symbolic link
- 不跟隨 Windows junction 或 reparse point
- 發現時列為 blocker
- 使用者只能排除該項目
- v1 不允許「仍然跟隨」

## PB-FILE-005　Nested Vault

發現子資料夾含 `.obsidian` 時視為 Nested Vault boundary：

- 不進入掃描
- 列為 blocker
- 使用者必須排除，或另建一個 Job

## PB-FILE-006　不支援檔案

所有非 `.md` 檔案列入 Inventory。使用者可使用一次性批次操作：

> 排除目前清單中的所有不支援檔案

操作前顯示檔案數、類型與總容量，二次確認並寫入 Audit。未確認前不得掃描。

## PB-FILE-007　文字編碼

正式支援：

- UTF-8
- UTF-8 with BOM

非 UTF-8：

- 不嘗試自動轉碼
- 列為 blocker
- 使用者必須在外部轉檔或排除

## PB-FILE-008　路徑安全

所有路徑：

- 使用平台正規化
- 必須確認 realpath 仍位於已核准 Root
- 禁止 `..` 路徑穿越
- 禁止 absolute path 出現在 Safe Package
- 不將原始絕對路徑寫入 Manifest

---

# 9. Markdown 處理契約

## PB-MD-001　Offset

所有 `start`、`end` 使用 JavaScript UTF-16 code unit offset，`end` 為 exclusive。

所有核心 API 與 Golden Fixture 都以同一模型驗證。

## PB-MD-002　不重新序列化

- 不以 Markdown AST 重新輸出整份文件
- Parser 只建立區域與 Span
- 實際替換對原始 UTF-16 字串從尾端往前 splice
- 保留空格、縮排、引號、換行與未修改內容
- 保留原始 LF／CRLF
- 保留 UTF-8 BOM 狀態
- 不自動格式化 frontmatter

## PB-MD-003　Frontmatter

- 掃描 value
- key 不自動改名
- key 命中敏感資料時標記 `MANUAL_REVIEW`
- 使用者只能排除 property、排除文件，或保留並接受風險
- Shadow Vault 中保留 YAML 型別與排版

## PB-MD-004　Code

- Fenced code 與 inline code 都掃描
- Secret 預設 `BLOCK_EXPORT`
- 一般識別資料列為人工候選
- 不自動更改程式變數名
- 使用者明確接受後才替換值

## PB-MD-005　Wikilink

對 `[[target|display]]`：

- `target` 由 Path Map 處理
- `display` 由一般文字規則處理
- Block reference 與 heading reference 必須保留
- Shadow Vault 產生後執行 link integrity test

## PB-MD-006　檔名與資料夾名稱

敏感名稱可在 Shadow Vault 中改為 opaque safe path。建立加密 Path Map，更新全部 Wikilink。Export Manifest 只能保存 sanitized relative path 與 Document ID。

## PB-MD-007　Capture Index

Regex 規則必須使用 named capture group 與 capture indices，禁止以 `fullMatch.indexOf(captured)` 作為唯一定位方式。

以下案例必須只選取右側值：

```text
LINE ID: LINE
password: password
secret: secret
```

---

# 10. Detection Engine

## PB-DET-001　核心 API

```ts
detectAll(
  document: ScanDocument,
  policy: DetectionPolicy
): DetectionRun
```

`detectAll`：

- 不接受 UI 顯示門檻
- 保留所有通過 Validator 的候選
- 保留重疊結果
- 保留命中規則與證據
- 不修改輸入
- 輸出可重現；只有 Candidate ID 可依 Run namespace 產生

## PB-DET-002　Rule Score

原有 `confidence` 全部改為 `ruleScore`。

`ruleScore` 只能用於：

- UI 排序
- 預設展開或收合
- 審核優先順序

不得用於：

- 宣稱準確率
- 自動跳過審核
- Export Guard
- 法律判定

## PB-DET-003　v1 規則類型

```text
TW_ID
TW_ARC
TW_TAX_ID
TW_PASSPORT
PASSPORT_CANDIDATE
TW_NHI_CARD
TW_MOBILE
TW_LANDLINE
TW_PHONE_SERVICE
TW_ADDRESS
TW_POSTCODE
TW_PLATE
TW_INVOICE
TW_BANK_ACCOUNT
CREDIT_CARD
EMAIL
IPV4
URL
LINE_ID
SECRET
PERSON
ORGANIZATION
PROJECT
PRODUCT
DEPARTMENT
SYSTEM
CUSTOM_TERM
AMBIGUOUS_IDENTIFIER
```

PERSON、ORGANIZATION、PROJECT、PRODUCT、DEPARTMENT、SYSTEM 與 CUSTOM_TERM 在 v1 只由客戶字典產生，不由 NER 產生。

## PB-DET-004　無情境候選

低情境候選不得靜默消失。規則可降低分數，但 `detectAll` 必須保留。

唯一例外：

- 護照廣義候選
- 健保卡純數字候選

這兩種在完全沒有同欄位或同行情境時可以不產生，以避免九碼與十二碼數字淹沒審核。

## PB-DET-005　Context Evidence

Context 不使用單純前後固定字元並跨行搜尋。優先順序：

1. 同一 label-value
2. 同一 YAML property
3. 同一 JSON property inside supported code block
4. 同一 Markdown table cell／column header
5. 同一行
6. 同一 paragraph

預設不跨換行。跨 paragraph 不提供情境加分。

## PB-DET-006　電話分類

- `090–098`：`TW_MOBILE`
- `099`、`0800`、`0809` 與支援的特殊服務號碼：`TW_PHONE_SERVICE`
- 一般區碼與合法長度：`TW_LANDLINE`
- 支援 `+886`
- 市話結構保留穩定首碼限制，但不維護會隨核配變動的完整號段白名單
- `0900`、`0910`、`0911` 不得被 landline validator 接受

## PB-DET-007　護照

高證據格式：

- `3` + 8 digits
- `D` + 8 digits
- `F` + 8 digits
- `G` + 8 digits

其他 9 digits 或 letter + 8 digits 只有在同欄位／同行護照情境時產生 `PASSPORT_CANDIDATE`，不得直接標成高信心 `TW_PASSPORT`。

## PB-DET-008　地址

至少支援：

- 縣市
- 鄉鎮市區
- 村里鄰
- 路街大道
- 段巷弄
- 號、之號、號之
- 樓、樓之、地下樓、B1/B2
- 鄉村門牌

需完整擷取：

```text
臺北市中正區濟南路1段2之2號3樓
臺北市中正區濟南路1段2號之2
```

## PB-DET-009　郵遞區號

支援 3、5、6 碼與數字直接接縣市：

```text
106409 臺北市大安區
110臺北市信義區
```

無情境時可以低分，但不得在 `detectAll` 消失。

## PB-DET-010　Secret

Secret 包含：

- Private Key
- PGP Private Key
- JWT
- API Key
- Access Token
- Password Assignment
- Recovery Code
- Known credential prefixes
- Database connection string with credentials

Secret 不建立可逆 Entity Token。使用者只能：

- 將值不可逆改為 `[REDACTED:SECRET]`
- 排除整份文件
- 回原始文件移除後重新掃描

其他 REDACT 的固定格式為：

```text
[REDACTED:<ENTITY_TYPE>]
```

例如信用卡為 `[REDACTED:CREDIT_CARD]`。Placeholder 不包含原始長度、末四碼或可推測資訊。

---

# 11. Candidate 與重疊

## PB-CAND-001　資料模型

Candidate 必須保留：

- candidateId
- documentId
- primaryType
- alternativeTypes
- start／end
- surfaceText（只存於加密資料）
- sourceTextHash
- ruleScore
- matchedRules
- evidence
- handling
- riskFlags
- reviewStatus

## PB-CAND-002　重疊解析

重疊不得只保留單一 Type 與 `blockOnly`。

優先順序：

1. 人工既有決策
2. 客戶字典精確匹配
3. 更完整的 Span
4. 有結構情境的規則
5. Validator／Checksum
6. 較高 ruleScore

任何被淘汰候選的風險旗標與 `BLOCK_EXPORT` 必須合併到保留結果。

Handling 嚴格度固定為：

```text
BLOCK_EXPORT > REDACT > TOKENIZE
```

Handling 是 occurrence-level 的有效政策。Entity 只保存 `defaultHandling`；任何 occurrence 的結構情境或風險規則都可以升級為更嚴格政策，但不得由 Entity 批次決策降級。

## PB-CAND-003　多重類型

格式本身無法區分時保留：

- primaryType
- alternativeTypes
- `AMBIGUOUS_TYPE`

例如舊式居留證與發票號碼。未人工確認前不得匯出。

## PB-CAND-004　審核單位

預設以 Entity Group 為單位審核：

- 同 canonical value 的 occurrences 預設一起處理
- 使用者可以展開全部 occurrences
- 使用者可以 Split
- Split 後產生新 Entity Group
- 不允許任何分數自動接受

---

# 12. 客戶字典

## PB-DICT-001　儲存

字典只存在 Vault 外 `dictionary.enc`，以 Client Root Key 衍生的 Dictionary Key 加密。

## PB-DICT-002　匹配

v1 固定規則：

- Unicode NFC
- Exact sequence match
- Longest match first
- 拉丁字母／數字條目採 Unicode word boundary
- CJK 條目不要求 word boundary
- 支援明確 Alias
- 中文預設不區分英文字母大小寫
- 英文條目可設定 sensitive／insensitive
- 不做 fuzzy match
- 不做拼音
- 不做繁簡自動轉換
- 不做 Levenshtein
- 不自動推測同名或別名

## PB-DICT-003　優先順序

```text
人工決策
→ 客戶字典
→ BLOCK_EXPORT risk
→ Checksum validator
→ Structured context
→ Low-score pattern
```

Block risk 不得因 primary type 改變而消失。

## PB-DICT-004　Client 與 Job Scope

- Client dictionary 可跨該 Client 的 Jobs 重用
- Job override 只作用於單一 Job
- Job override 優先於 Client dictionary
- 不同 Client 不共享
- 匯出 Safe Package 不包含字典內容

---

# 13. Review UX

## PB-UX-001　畫面

固定畫面：

1. Welcome／Security Notice
2. Client Manager
3. New Job Wizard
4. File Inventory
5. Scan Progress
6. Review Workspace
7. Entity Merge／Split
8. Diff Preview
9. Shadow Build
10. Residual Review
11. Export Summary
12. Result Import
13. Restore Preview
14. Job Archive／Backup
15. Settings／About

## PB-UX-002　風險分組

- Block
- Ambiguous
- High：`ruleScore >= 0.85`
- Medium：`0.70 <= ruleScore < 0.85`
- Low：`ruleScore < 0.70`
- Accepted
- Ignored
- Modified

UI 預設展開 `ruleScore >= 0.7`，低分收合。頁面固定顯示未處理低分數量，不得讓使用者誤以為為零。

## PB-UX-003　批次操作

允許：

- 批次接受同類型
- 批次忽略目前篩選結果
- 批次改為 Redact
- 批次排除不支援檔案

每次必須：

- 顯示影響數量
- 顯示至少三個範例
- 二次確認
- 寫入 Audit
- 允許在同一 Job 內 Undo，直到 Shadow Build 開始

## PB-UX-004　匯出按鈕

Disabled 時必須顯示所有原因，例如：

- 仍有 12 個未審核候選
- 有 2 個 Secret
- 有 4 個不支援附件未排除
- 原始文件已變更
- Mapping 尚未解鎖
- Residual Scan 尚未完成

不得只有灰色按鈕而無說明。

## PB-UX-005　可用性

- 所有高風險按鈕有文字標籤
- 支援鍵盤操作
- Focus order 可預測
- 不只用顏色傳達狀態
- Screen reader 有名稱與狀態
- 確認對話框預設 focus 在取消
- Escape 關閉非破壞性 Modal
- 破壞性操作不能以 Escape 直接確認

---

# 14. Tokenization 與 Mapping

## PB-TOKEN-001　Token 格式

```text
⟦PB:<TYPE>:<ENTITY_ID>:<TAG>⟧
```

- `ENTITY_ID`：10 bytes CSPRNG，Crockford Base32 16 字元
- `TAG`：12 bytes HMAC，Crockford Base32 20 字元
- `TYPE`：Schema enum
- Token 不含 Job ID、客戶名稱、原文或可解密密文

## PB-TOKEN-002　同 Job 一致

同一 Entity 在同一 Job 使用相同 Token。Entity canonical fingerprint 使用 keyed HMAC，不使用裸 SHA-256。

## PB-TOKEN-003　跨 Job 不一致

每個 Job 使用獨立 Token Key 與隨機 Entity ID。相同原文在兩個 Job 中不得產生相同 Token。

## PB-TOKEN-004　Canonicalization

- TW_ID／ARC：大寫、移除空白與連字號
- Mobile：正規化為 `+886`
- Landline：正規化區碼與號碼；分機獨立
- Email：domain 小寫；local part 保留
- PERSON／ORG／PROJECT：Unicode NFC；Alias 只由字典或人工指定
- URL：預設不合併不同字串
- Secret：不建立 Entity

## PB-TOKEN-005　Surface Form 與 Occurrence Policy

Occurrence Map 保存加密 surface form、有效 handling 與 risk flags。對外分析結果中的 Token 還原為 Entity 的 `preferredDisplay`，不承諾重建外部修改後文件的每一種原始格式。原始 Vault 永遠是精確原文來源。

同一 Entity 的不同 occurrence 可以有不同有效政策。例如同一字串在一般欄位可 `TOKENIZE`，出現在密碼欄位時必須 `BLOCK_EXPORT` 或 `REDACT`。Entity-level 決策只是預設值，不能降低 occurrence-level 風險。

## PB-TOKEN-006　替換

- 從尾端向前
- 驗證 Span 未重疊
- 驗證 `sourceTextHash`
- 每次 replacement 寫入 encrypted occurrence
- 不直接寫原始 Vault
- Tokenize function 為純函式

---

# 15. Shadow Vault

## PB-SHADOW-001　輸出

```text
<job-id>-sanitized/
```

輸出必須位於使用者指定、非原始 Vault、非 Secure Store 的本機路徑。

## PB-SHADOW-002　內容

保留：

- sanitized Markdown
- 原始資料夾層次的安全對應
- 可解析的 Wikilink
- frontmatter 結構
- tags、callouts、block IDs
- line ending／BOM

不得包含：

- Mapping
- 字典
- 原始值
- 原始絕對路徑
- `.obsidian`
- `.trash`
- Sync metadata
- Audit
- key envelope
- transaction journal
- 不支援附件

## PB-SHADOW-003　建置

Shadow Build 使用 staging directory：

1. 建立空 staging
2. 寫入每個 sanitized file
3. 驗證 Hash
4. 執行 link integrity
5. 執行 Residual Scan
6. 完成後原子 rename 到最終目錄
7. 失敗時刪除 staging，不動既有完整 Shadow Vault

---

# 16. Residual Scan 與 Export Guard

## PB-EXPORT-001　Residual Scan

`scanResidualAll()` 不接受 UI threshold，掃描全部 sanitized documents。

## PB-EXPORT-002　Residual 結果

Residual Candidate 必須重新進入 Review。使用者處理後重新建置受影響文件並再掃描。Residual 未清零或未明確人工忽略前，不能匯出。

## PB-EXPORT-003　Export Gate

全部成立才允許匯出：

- Inventory resolved
- Source snapshot current
- 所有 Candidate 已決策
- 無 unresolved ambiguity
- 無 unresolved Secret／Block
- Mapping／Dictionary／Review 已加密
- Shadow Vault 完整
- Residual resolved
- Path integrity 通過
- Manifest schema 通過
- Package Hash 完成
- Audit transaction committed

## PB-EXPORT-004　Safe Package

```text
<job-id>.safe.zip
├── manifest.json
├── schema.json
├── notes/
├── entity-index.json
└── checksums.json
```

`entity-index.json` 只能包含 Token、Type 與匿名 Document ID，不得包含原始值、Alias 或原始路徑。

## PB-EXPORT-005　壓縮安全

- ZIP entry 只能是 normalized relative path
- 禁止 symlink
- 禁止 absolute path
- 禁止 `..`
- 讀回自我驗證後才標記 `EXPORTED`
- Package 最大 2 GB；超過時 v1 阻擋，不做分卷

---

# 17. Result Import 與 Restore

## PB-IMPORT-001　輸入

v1 只接受單一 UTF-8 JSON，不接受 ZIP、Markdown、HTML、Office、PDF 或執行檔。

## PB-IMPORT-002　Schema

使用 `result-package.schema.json`，`additionalProperties: false`。Major version 必須完全相同；Minor version 不得高於 Plugin 支援值。

## PB-IMPORT-003　整包拒絕

以下任一項成立即整包拒絕：

- Job ID 不符
- Source Package Hash 不符
- Schema 不符
- Duplicate findingId
- Unknown documentId
- Unknown Token
- Invalid Token HMAC
- Cross-job Token
- Malformed token-like sequence
- Control character
- Path traversal
- 超過大小與數量限制
- 未允許欄位

## PB-IMPORT-004　不可信文字

- UI 只用 text node 顯示，不使用 `innerHTML`
- Result summary 視為 plain text
- 產生 Markdown 時 escape raw HTML
- 不執行 Obsidian URI
- 不解析 script、iframe、event handler
- 不自動開啟外部連結

## PB-RESTORE-001　還原

流程：

```text
選擇 Result JSON
→ Schema validation
→ Job／Package validation
→ Token validation
→ 顯示摘要
→ 解鎖 Client
→ Restore Preview
→ 使用 preferredDisplay 取代 Token
→ 產生 Result Vault
```

不得覆寫原始 Vault、Shadow Vault 或先前完整 Result Vault。

## PB-RESTORE-002　Result Vault

```text
<job-id>-results/
├── findings.md
├── findings.json
└── restore-manifest.json
```

`findings.md` 是安全 escape 後的可讀版本；`findings.json` 保留驗證後結構。Result Vault 不包含 Mapping。

---

# 18. Audit

## PB-AUDIT-001　加密

Audit 存於 `audit.enc`，使用獨立 Audit Key。不得把原文寫入一般 Log、Console 或 GitHub Issue。

## PB-AUDIT-002　事件鏈

每個事件包含：

- sequence
- previousHash
- eventHash
- timestamp
- jobId
- deviceId
- operatorAliasFingerprint
- action
- subject opaque ID
- safe counts／error codes
- pluginVersion

事件 Hash 形成 append-only chain。發現中斷時 Job 進入 `BLOCKED`。

## PB-AUDIT-003　不得記錄

- 原始姓名
- 原始電話
- Email
- 地址
- Secret
- Passphrase
- CRK／JRK／Derived Key
- Mapping 明文
- 原始絕對路徑

---

# 19. Concurrency、Transaction 與 Recovery

## PB-TXN-001　Atomic Write

所有持久化更新：

1. 寫入同檔案系統 temp
2. fsync file
3. 驗證 Hash／Schema
4. 原子 rename
5. 必要時 fsync directory
6. 更新 encrypted journal
7. Commit audit event

## PB-TXN-002　Lock

`lock.json` 為最小化 plaintext，只含 opaque IDs、PID、operation、heartbeat 與 nonce。Heartbeat 每 10 秒更新，60 秒無更新視為 stale candidate；必須先檢查 PID／process start 與 Journal 才能復原。

## PB-TXN-003　Crash Recovery

啟動時：

- 掃描 incomplete journal
- 不自動覆寫 target
- 驗證 temp 與 target Hash
- 顯示 Recovery Wizard
- 預設選擇 Rollback
- Roll-forward 只在所有 step 已寫入且驗證通過時可用
- Recovery 完成後才移除 stale lock

## PB-TXN-004　掃描取消

取消掃描：

- 保留已完成的加密掃描結果
- 不產生 Shadow Vault
- Job 回到 `DRAFT` 或 `REVIEW_REQUIRED`
- 不留下 plaintext temp
- 可從 checkpoint 繼續

---

# 20. Backup、刪除與遷移

## PB-BACKUP-001　Job Backup

v1 支援加密 `.pbjob`：

- 建立時要求獨立 Backup Passphrase
- 產生獨立 scrypt Salt 與 KEK
- 重新包裝 JRK，不包含 Client Passphrase
- 包含所有加密 Job files、Schema、Hash 與 backup manifest
- 不包含原始 Vault、Shadow Vault、Result Vault
- 匯入時先驗證，再將 JRK 重新包裝到目標 Client

## PB-BACKUP-002　密碼遺失

- Client Passphrase 無法重設或由官方恢復
- Backup Passphrase 無法恢復
- 不建立後門
- UI 必須在建立時要求使用者確認理解

## PB-DELETE-001　刪除類型

分開提供：

- 刪除 Shadow Vault
- 刪除 Result Vault
- 刪除 Export Package
- 刪除 Job 安全資料
- 刪除 Client

刪除 Job 安全資料或 Client 時，必須輸入 Job ID／Client Alias 確認。刪除 `job.key` 後不可還原。不得宣稱 SSD 上的物理安全抹除。

## PB-MIG-001　版本

- Plugin：Semantic Versioning
- Job Schema：Semantic Versioning
- Envelope：獨立 version
- Export／Result：獨立 version

## PB-MIG-002　Copy-on-write

資料遷移：

1. 解鎖
2. 建立同金鑰加密 Recovery Snapshot
3. 在 staging 中遷移
4. 驗證全部 Schema／Crypto／Hash
5. 原子切換 active
6. 失敗保留舊版
7. 不刪 Recovery Snapshot，直到使用者下一次成功開啟並確認

Alpha 不做自動背景更新。Release 由使用者手動安裝。

---

# 21. 錯誤政策

## PB-ERR-001　錯誤格式

每個錯誤必須有：

- Error Code
- 安全摘要
- Job ID 或 opaque subject
- 使用者可執行的下一步
- 是否阻擋目前操作
- Technical details 可複製，但不得含敏感值

## PB-ERR-002　主要 Code

```text
PB-PLATFORM-001  不支援的 Desktop Runtime
PB-STORE-001     Secure Store 路徑不安全
PB-STORE-002     Store Schema 不符
PB-LOCK-001      Job 被其他程序鎖定
PB-CRYPTO-001    Passphrase 錯誤或 Key Envelope 損毀
PB-CRYPTO-002    加密資料驗證失敗
PB-FILE-001      不支援檔案待排除
PB-FILE-002      非 UTF-8
PB-FILE-003      Symlink／Junction
PB-FILE-004      原始檔案已變更
PB-SCAN-001      掃描失敗
PB-REVIEW-001    尚有未審核候選
PB-REVIEW-002    尚有 ambiguous candidate
PB-EXPORT-001    存在 Block 項目
PB-EXPORT-002    Residual 未處理
PB-EXPORT-003    Shadow Vault 驗證失敗
PB-IMPORT-001    Result Schema 不符
PB-IMPORT-002    Job／Package 不符
PB-IMPORT-003    未知或偽造 Token
PB-IMPORT-004    不安全內容
PB-RESTORE-001   Mapping 未解鎖
PB-MIG-001       Migration 失敗
PB-AUDIT-001     Audit Chain 損毀
```

---

# 22. 無網路與供應鏈

## PB-NET-001　Runtime

正式 Production Bundle 不得包含可達的網路客戶端路徑：

- fetch
- requestUrl
- XMLHttpRequest
- WebSocket
- Node http／https
- net／tls／dgram
- Electron session network
- child_process 用於啟動網路工具
- 動態下載
- Telemetry

## PB-NET-002　CI

每個 PR 與 Release：

- 掃描 source
- 掃描 dependency tree
- 掃描 production bundle
- 在 network-deny 測試環境執行整合測試
- 發現未核准 socket 嘗試即失敗
- 產生 SBOM
- Secret scan
- License scan
- Dependency lock verification

## PB-NET-003　README 宣稱

允許精確寫：

> Privacy Bridge 的正式版不包含網路客戶端路徑。CI 會掃描 production bundle，並在禁止對外連線的環境執行整合測試；任何未核准的網路行為都會使建置失敗。

不得只以 grep `fetch` 作為安全證明。

---

# 23. 效能、可用性與相容性

## PB-PERF-001　基準

Alpha Release Target：

- 1,000 個 Markdown／50 MB：90 秒內完成掃描
- UI 主執行緒無連續 250 ms 以上卡住
- Review list 使用虛擬化
- 100 KB 單篇：500 ms 內
- 50,000 Candidate：可搜尋與分頁
- 待機額外記憶體：150 MB 以下
- Mapping 解鎖：目標 3 秒內；不得降低固定 scrypt 參數達成

測試環境固定記錄硬體、OS、Obsidian 與 Plugin 版本。

## PB-PERF-002　Concurrency

- 文件掃描最大並行 4
- Hash 最大並行 4
- Crypto 寫入單一序列
- UI 每處理最多 25 ms 主動 yield
- 不提供使用者調整並行度的 v1 設定

## PB-I18N-001　語言

- `zh-TW` 完整
- `en` fallback
- 所有文案使用 i18n key
- Error Code 不翻譯
- JSON Schema enum 不翻譯

---

# 24. Testing 與 Acceptance

## PB-TEST-001　測試層

- Unit
- Regression
- Golden fixture
- Property-based
- Fuzz
- Schema
- Crypto vector
- Integration
- Crash recovery
- Network-deny
- Performance
- Manual security review

## PB-TEST-002　既有 79 Tests

既有測試保留為 `legacy regression seed`，不得宣稱代表實際 Precision／Recall。它們是最低回歸基線，不是 Release 完整門檻。

## PB-TEST-003　Traceability

每個 Requirement、Issue、PR 與 Test 必須連結：

```text
Requirement ID
Acceptance ID
Test file
Release Gate
```

## PB-TEST-004　Release Blocker

`docs/ACCEPTANCE-MATRIX.md` 中標記 `YES` 的項目全部通過，才可發布 Alpha。

---

# 25. Release Gates

## Gate A — Core Ready

- Core 與 Obsidian API 分離
- detectAll
- UTF-16 offset
- capture indices
- structured context
- multi-candidate
- dictionary
- 既有回歸與新 P0 全過

## Gate B — Security Ready

- Secure Store outside Vault
- Client／Job key hierarchy
- Crypto vectors
- no plaintext temp
- no network
- no telemetry
- Secret block
- Audit encryption
- threat model review

## Gate C — Workflow Ready

- Client／Job
- Inventory
- Scan
- Review
- Tokenize
- Shadow
- Residual
- Export
- Import
- Restore
- Backup／Recovery

## Gate D — GitHub Alpha Ready

- 105 Acceptance 全部 Release Blocker 通過
- macOS manual test
- Windows manual test
- README
- SECURITY
- SBOM
- checksum
- Demo Vault
- install／upgrade／rollback test
- Alpha limitation banner
- 不建議處理正式客戶資料的警告

---

# 26. Definition of Ready

Epic 開始前必須有：

- Requirement IDs
- Input／Output
- Data contract
- State transition
- Error behavior
- Acceptance IDs
- Test plan
- Security implications
- Dependencies
- Non-goals

缺漏時 Tech Lead 依本文件補齊並寫 ADR，不向 Product Owner 提開放式問題。

---

# 27. Definition of Done

功能完成必須：

- Code complete
- TypeScript strict
- Lint
- Unit／Regression／Acceptance tests
- Negative tests
- Schema validation
- No original Vault mutation
- No plaintext sensitive log
- No network behavior
- Documentation updated
- Changelog updated
- Requirement／Acceptance traceability
- Security review
- PR CI pass

畫面可操作但未通過資料與安全驗收，不算完成。

---

# 28. 實作順序

固定 Merge Order：

```text
E00 Repository／CI
E01 Schema／Core Types
E02 Secure Store／Key Hierarchy
E03 File Inventory／Snapshot
E04 Detection／Context／Candidate
E05 Dictionary／Entity Group
E06 Review State／Audit
E07 Token／Mapping／Occurrence
E08 Markdown／Path Map
E09 Shadow Vault
E10 Residual／Export Guard
E11 Safe Package
E12 Result Validation／Restore
E13 Backup／Migration／Recovery
E14 Obsidian UX Integration
E15 Security／Performance Hardening
E16 GitHub Alpha Release
```

不得跳過 E01／E02 直接把舊規則塞進 UI。

---

# 29. 最終鎖定聲明

以下決策已凍結，不需再向 Product Owner 詢問：

- 產品與名稱
- GitHub Public Alpha
- MIT
- Desktop Only
- Markdown Only
- No NER v1
- No network／telemetry
- Original Vault read-only
- Secure Store outside Vault
- Client-level Passphrase＋independent Job keys
- scrypt／AES-GCM／HKDF／HMAC 參數
- Entity-level review
- Low-score candidates retained
- Secret／Credit Card 預設 Block
- Shadow Vault
- Structured JSON result
- Unknown／cross-job token reject
- Backup／migration／recovery
- Audit actor identity
- File inventory exclusions
- UTF-16 offset
- No AST reserialization
- Release Stop conditions
- Merge order
- Acceptance Gates

**Product Scope：FROZEN**  
**Architecture：FROZEN**  
**Security Model：FROZEN**  
**Data Contracts：FROZEN**  
**Open Product Decisions：0**  
**Development Status：READY**  
