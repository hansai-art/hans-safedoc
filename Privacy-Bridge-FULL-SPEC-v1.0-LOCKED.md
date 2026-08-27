# Privacy Bridge v1.0 LOCKED
## Product, Engineering, Security and Delivery Complete Specification
**狀態：** READY FOR IMPLEMENTATION  
**Open product decisions：** 0  
> 這是方便單檔交付的合併版本。發生衝突時，套件內 `docs/MASTER-SPEC.md` 與 machine-readable Schema 仍依規格優先順序生效。


---

# 文件：主規格

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
- 不自動下載模型
- 不使用遠端 NER
- 不內建本機 BERT、LLM 或大型模型
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


---

# 文件：決策登錄

# Decision Register

**版本：** 1.0.0 LOCKED  
**Open decisions：** 0  
**規則：** 本表中的決策不得在 Issue 或 PR 中重新開放。新需求進入 v1.1 backlog。

| ID | 決策 | 固定內容 | 理由／後果 |
|---|---|---|---|
| DEC-001 | 產品型態 | Obsidian Desktop 外掛 | 先滿足既有知識庫流程；Core 保持平台無關 |
| DEC-002 | 產品名稱 | Privacy Bridge | 顯示名稱不含 Obsidian；Plugin ID 為 `privacy-bridge` |
| DEC-003 | License | MIT | 允許企業評估與衍生；不得複製 GPL 程式碼改標 MIT |
| DEC-004 | 發布 | GitHub Public Alpha | Alpha 前不送官方外掛目錄 |
| DEC-005 | 正式用語 | 可逆假名化／安全代碼化 | 不宣稱完全匿名化 |
| DEC-006 | 平台 | Desktop Only | 需要 Vault 外檔案與 Node Crypto |
| DEC-007 | OS | macOS、Windows；Linux best effort | Alpha Release 必須驗證前兩者 |
| DEC-008 | v1 格式 | UTF-8 Markdown | PDF、圖片、Office 延後 |
| DEC-009 | 不支援檔案 | 必須盤點並明確排除 | 禁止靜默忽略 |
| DEC-010 | 原始 Vault | 永遠唯讀 | 所有輸出建立新目錄 |
| DEC-011 | 輸出 | Sanitized Shadow Vault | 避免破壞原始資料 |
| DEC-012 | 還原輸出 | Result Vault | 不覆寫原始或 Shadow |
| DEC-013 | 雲端 | 外掛完全不連網 | 只產生與讀取檔案 |
| DEC-014 | Telemetry | 無 | 不收集使用資料 |
| DEC-015 | 模型 | v1 不做 NER／LLM | 先完成可驗證規則、字典與人工審核 |
| DEC-016 | 規則分數 | 名稱為 `ruleScore` | 不得呈現為準確率 |
| DEC-017 | 低分候選 | Core 全部保留 | UI 可收合，Export Guard 不可忽略 |
| DEC-018 | 護照／健保純數字 | 無情境可不產生 | 防止審核量失控 |
| DEC-019 | Review | Entity Group 為預設單位 | 一次處理跨文件 occurrences |
| DEC-020 | Auto Accept | 禁止 | 任何分數都需人工決策 |
| DEC-021 | 批次操作 | 允許但需摘要、二次確認與 Audit | 控制誤操作 |
| DEC-022 | 字典位置 | Vault 外加密 | 字典本身可能是敏感資料 |
| DEC-023 | 字典匹配 | NFC、exact、longest-first | v1 不做模糊推測 |
| DEC-024 | 字典 Scope | Client shared＋Job override | 兼顧重用與案件隔離 |
| DEC-025 | Secure Store | OS Application Data | 不進入 Vault 或 Sync |
| DEC-026 | 同步路徑 | v1 直接拒絕 | 不允許忽略警告 |
| DEC-027 | Client | 安全隔離與 Passphrase 單位 | 每個 Client 獨立 CRK |
| DEC-028 | Job | 每個 Job 獨立 JRK | 防止跨 Job Token 與資料關聯 |
| DEC-029 | Passphrase | Client-level | 解鎖一次可操作該 Client Jobs |
| DEC-030 | Passphrase 規則 | 12–256 Unicode code points | 不做複雜度組合規則 |
| DEC-031 | Passphrase normalization | 不正規化 | 避免輸入被意外改變 |
| DEC-032 | KDF | scrypt N=131072,r=8,p=1 | 固定跨平台參數 |
| DEC-033 | Encryption | AES-256-GCM | 認證加密 |
| DEC-034 | IV | 12 bytes，每次隨機 | 禁止重用 |
| DEC-035 | HKDF | SHA-256 domain separation | 分離 data、token、audit、package keys |
| DEC-036 | Token MAC | HMAC-SHA-256 截短 12 bytes | 96-bit token authenticity |
| DEC-037 | Token ID | 10 random bytes | 不由原文 Hash 直接顯示 |
| DEC-038 | Token 編碼 | Crockford Base32 | 可讀且避免易混淆字元 |
| DEC-039 | Token Scope | 同 Job 一致、跨 Job 不一致 | 保留分析關聯、避免跨案件追蹤 |
| DEC-040 | Secret | Occurrence-level Block 或不可逆 Redact | 不建立可逆 Token；同值在其他非秘密 occurrence 可另行 Tokenize |
| DEC-041 | Credit Card | 預設 Block | 使用者只能 Redact 或排除文件 |
| DEC-042 | Mapping | Vault 外加密 | Safe Package 永遠不含 Mapping |
| DEC-043 | Audit | 加密 Hash chain | 不記錄原文 |
| DEC-044 | Operator | 自填 Alias＋隨機 deviceId | 不讀 OS 帳號或 Email |
| DEC-045 | Auto Lock | 15 分鐘、睡眠、切換 Client、關閉 App | 不永久記住 Passphrase |
| DEC-046 | Source offset | UTF-16 code units | 與 JS slice 一致 |
| DEC-047 | Markdown 輸出 | 不重新序列化 AST | 保留原排版與最小 Diff |
| DEC-048 | Replacement | 從尾端向前 | 避免 offset 位移 |
| DEC-049 | Capture position | named capture indices | 禁止 `indexOf(captured)` |
| DEC-050 | Context | 結構優先且預設不跨行 | 避免跨行污染 |
| DEC-051 | Overlap | 保留 alternative types 與 occurrence-level risk flags | Entity default 不得降低 occurrence Block |
| DEC-052 | 099 | TW_PHONE_SERVICE | 不當一般 Mobile，也不漏掉 |
| DEC-053 | 市話 | 區碼＋穩定結構＋長度 | 不維護易腐化的完整核配白名單 |
| DEC-054 | +886 | v1 支援 | 國際格式常見 |
| DEC-055 | 護照 | 已知格式＋廣義情境候選兩層 | 不過度宣稱類型 |
| DEC-056 | 郵遞區號 | 3／5／6 碼及接縣市 | 無情境仍可低分候選 |
| DEC-057 | Hidden `.md` | 除系統路徑外仍掃描 | 避免漏掉 |
| DEC-058 | Symlink／Junction | 不跟隨，必須排除 | 避免越界 |
| DEC-059 | Nested Vault | 不進入，必須另建 Job 或排除 | 明確安全邊界 |
| DEC-060 | Encoding | UTF-8／UTF-8 BOM only | 不自動猜測轉碼 |
| DEC-061 | Snapshot | size、mtime、SHA-256、encoding、line ending | Build 前重驗 |
| DEC-062 | Source change | 變更文件重掃；相關 Entity 重審 | 不使用 stale decision |
| DEC-063 | Safe Package | ZIP，最大 2 GB，不分卷 | v1 簡化輸出 |
| DEC-064 | Result Input | 單一 UTF-8 JSON | 不接收富格式或可執行內容 |
| DEC-065 | Schema | Draft 2020-12，additionalProperties false | 鎖定資料契約 |
| DEC-066 | Unknown Token | 整包拒絕 | 防止 Mapping oracle |
| DEC-067 | Cross-job Token | 整包拒絕 | 防止越權還原 |
| DEC-068 | Result rendering | plain text；Markdown 安全 escape | 不執行 HTML／URI |
| DEC-069 | Backup | `.pbjob`，獨立 Backup Passphrase | 可跨裝置還原，不含 Client Passphrase |
| DEC-070 | Passphrase loss | 無後門、無重設 | 明確告知不可恢復 |
| DEC-071 | Delete | 分類刪除；不宣稱安全抹除 | SSD／備份無法保證物理清除 |
| DEC-072 | Migration | copy-on-write＋encrypted recovery snapshot | 失敗不覆寫舊資料 |
| DEC-073 | Alpha Update | 手動安裝 | 不自動背景更新 |
| DEC-074 | Lock | Heartbeat＋PID＋process start＋journal | 防止並行寫入 |
| DEC-075 | Recovery 預設 | Rollback | Roll-forward 只有全部驗證後可選 |
| DEC-076 | Core Scan concurrency | 最大 4 | 固定，不提供 v1 設定 |
| DEC-077 | Crypto writes | 序列化 | 避免競態與 IV／Journal 問題 |
| DEC-078 | UI Language | zh-TW＋en fallback | 字串全部使用 i18n key |
| DEC-079 | Accessibility | 鍵盤、screen reader、非色彩唯一 | Alpha 必做 |
| DEC-080 | Existing 79 tests | Legacy regression seed | 不等於 Precision／Recall |
| DEC-081 | Acceptance | 105 項矩陣 | Release blocker 全數通過 |
| DEC-082 | No-question protocol | 安全預設自行決策 | 不以一般問題等待 Product Owner |
| DEC-083 | Stop 條件 | STOP-01 至 STOP-04 | 只阻擋 Release，不停其他工作 |
| DEC-084 | Spec priority | Master→Schema→Acceptance→Fixture→Code | 避免規格漂移 |
| DEC-085 | Merge order | E00 至 E16 固定 | 不先做 UI 再補安全架構 |
| DEC-086 | Official directory | Alpha 不送審 | Security Gate 後再評估 |
| DEC-087 | Production logs | 不含敏感內容、預設 console 清空 | Debug export 需先安全過濾 |
| DEC-088 | Crash report | 不自動上傳 | 使用者手動複製安全摘要 |
| DEC-089 | Clipboard | 不複製 Passphrase／Key／原文批次資料 | 單筆原文需使用者主動操作且警告 |
| DEC-090 | Release artifacts | bundle、manifest、styles、SBOM、checksum、source commit | 可稽核發佈 |

## Superseded Draft Decisions

以下舊草案內容由本版取代：

- 「每個 Job 設定獨立密碼」改為 Client Passphrase＋獨立 Job Root Key。
- 「任何 9 碼都標 TW_PASSPORT」改為已知格式＋`PASSPORT_CANDIDATE`。
- 「099 是一般手機」改為 `TW_PHONE_SERVICE`。
- 「Residual 使用 0.7 門檻」改為 `scanResidualAll()` 不使用 UI 門檻。
- 「blockOnly 布林」改為 `handling`、`riskFlags`、`matchedRules`。
- 「字典可放 Vault」明確禁止。
- 「grep 不到 fetch 即無網路」改為 source、dependency、bundle 與 runtime network-deny 四層驗證。


---

# 文件：系統架構

# Architecture

**版本：** 1.0.0 LOCKED

---

# 1. Components

```text
Obsidian UI
  ├─ Command / View / Modal
  ├─ Job Controller
  └─ Presentation adapters
        │
Application Services
  ├─ ClientService
  ├─ JobService
  ├─ ScanService
  ├─ ReviewService
  ├─ BuildService
  ├─ ExportService
  ├─ ImportService
  ├─ RestoreService
  └─ RecoveryService
        │
Core Domain
  ├─ Inventory
  ├─ Detection / Context
  ├─ Candidate Resolution
  ├─ Dictionary / Entity
  ├─ Token / Mapping
  ├─ Markdown Spans / Path Map
  ├─ Residual / Export Guard
  └─ Result Validation / Restore
        │
Ports
  ├─ SourceReader
  ├─ OutputWriter
  ├─ SecureStore
  ├─ CryptoProvider
  ├─ Clock
  ├─ RandomSource
  └─ AuditSink
        │
Adapters
  ├─ ObsidianVaultReader
  ├─ NodeExternalFolderReader
  ├─ NodeOutputWriter
  ├─ NodeSecureStore
  └─ NodeCryptoProvider
```

---

# 2. Dependency Rule

Dependency 只能向內：

```text
UI → Application → Domain ← Ports ← Adapters
```

Domain 不知道：

- Obsidian
- Electron
- Node filesystem
- UI
- ZIP library
- OS path
- GitHub

---

# 3. Packages

## `packages/core`

- Domain types
- Pure logic
- Schema validators
- State machine
- Detection
- Review reducer
- Token
- Package validation

## `packages/obsidian-plugin`

- `Plugin` lifecycle
- Workspace Views
- Commands
- Source／Output adapters
- Secure Store adapter
- OS integration
- i18n

## `packages/schemas`

- 18 JSON Schemas
- generated validators/types
- examples
- version catalog

---

# 4. Application Services

每個 Service：

- 一個明確 use case
- 接受 validated command
- 回傳 typed result
- 不直接顯示 UI
- 不把 raw exception 傳到 UI
- mutation 使用 Unit of Work／Journal
- Audit 在 commit 後寫入同 transaction

---

# 5. Read / Write Separation

## SourceReader

只讀：

```ts
interface SourceReader {
  inventory(scope: SourceScope, signal: AbortSignal): AsyncIterable<InventoryItem>;
  stat(document: SourceDocumentRef): Promise<SourceStat>;
  readBytes(document: SourceDocumentRef): Promise<Uint8Array>;
  realpath(ref: SourcePathRef): Promise<string>;
}
```

沒有 write method。

## OutputWriter

只能寫入已批准 output root：

```ts
interface OutputWriter {
  createStaging(kind: 'SHADOW' | 'RESULT' | 'PACKAGE'): Promise<StagingHandle>;
  writeRelative(handle: StagingHandle, relativePath: SafeRelativePath, bytes: Uint8Array): Promise<void>;
  validate(handle: StagingHandle): Promise<OutputValidation>;
  publish(handle: StagingHandle, target: OutputTarget): Promise<PublishedOutput>;
  rollback(handle: StagingHandle): Promise<void>;
}
```

Source handle 與 Output handle 使用不同 branded types，編譯時不能互換。

---

# 6. State Ownership

| State | Owner |
|---|---|
| Client／Job persistent state | Secure Store |
| Current unlocked keys | ClientSession memory |
| UI filters／selection | UI local state |
| Pending Review draft | Encrypted Review State |
| Scan checkpoint | Encrypted Detection Run |
| Build progress | Encrypted Transaction Journal |
| Source content | Source system；never copied to Store except approved encrypted occurrence/context |
| Shadow／Result | Output directories |

---

# 7. Event Flow

## Scan

```text
UI command
→ JobService validates state
→ Inventory snapshot
→ ScanService batches documents
→ Core parser/detector
→ Secure Store encrypted checkpoint
→ Entity grouping
→ State REVIEW_REQUIRED
→ Audit commit
```

## Build

```text
ReviewService confirms zero pending
→ Source snapshot revalidation
→ Mapping build
→ Tokenize pure functions
→ Output staging
→ Link validation
→ Residual scan
→ State RESIDUAL_REVIEW or READY_TO_EXPORT
```

## Import

```text
Read Result bytes with limit
→ JSON parse
→ Schema
→ Job/package binding
→ Token grammar/MAC/map
→ safe text validation
→ encrypted persistence
→ State RESULT_IMPORTED
```

---

# 8. Error Boundary

Adapters convert native errors to safe domain codes. Domain never exposes:

- native stack
- errno path
- raw input
- Crypto provider detail

Technical diagnostics are generated separately from allowlisted metadata.

---

# 9. Cancellation

Use `AbortSignal` for scan、hash、build、package、restore。

- Pure function step不需中斷。
- File write完成 atomic unit 後才回應 cancel。
- Crypto operation不在中途留下 output。
- Cancel結果由 Service決定回到合法 Job state。

---

# 10. Plugin Lifecycle

## onload

- Register views/commands/settings
- Validate desktop runtime
- Locate `store.json`
- Do not unlock automatically
- Inspect stale locks without reading encrypted journal
- No network calls

## onunload

- Abort active cancellable operations
- Finish or rollback atomic write
- Lock all Clients
- Clear sensitive UI
- Best-effort zero key buffers
- Unregister views


---

# 文件：Core API 契約

# Core API Contracts

**版本：** 1.0.0 LOCKED  
**注意：** 以下 TypeScript 是契約，不要求檔案完全同名；行為不可改變。

```ts
type Result<T, E extends PBError = PBError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

interface PBError {
  code: PBErrorCode;
  messageKey: string;
  blocking: boolean;
  safeContext: {
    jobId?: JobId;
    documentId?: DocumentId;
    operation?: string;
    count?: number;
  };
}
```

---

# 1. Inventory

```ts
interface InventoryService {
  createInventory(
    scope: SourceScope,
    policy: InventoryPolicy,
    signal: AbortSignal
  ): Promise<Result<FileInventory>>;

  applyExclusions(
    inventory: FileInventory,
    decisions: ExclusionDecision[]
  ): Result<ResolvedInventory>;
}
```

Invariant：

- unresolved blocker count = 0 才能開始 scan。
- Fixed system exclusion不能被重新納入。
- Source paths不進 Audit。

---

# 2. Parse

```ts
interface MarkdownParser {
  parse(document: ScanDocument): Result<ParsedDocument>;
}
```

`ParsedDocument` 保留 source string 與 Regions；不產生重新序列化 Markdown。

---

# 3. Detect

```ts
function detectAll(
  document: ParsedDocument,
  registry: DetectorRegistry,
  dictionary: DictionarySnapshot,
  policy: DetectionPolicy
): Result<DetectionDocumentResult>;
```

`DetectionPolicy` 不含 UI threshold。

```ts
interface DetectionPolicy {
  rulesVersion: SemVer;
  locale: 'zh-TW' | 'en';
  enabledRuleIds: ReadonlySet<RuleId>;
  maxCandidatesPerDocument: number;
}
```

超過 candidate limit 使用 PB-PERF-001 block，不截斷。

---

# 4. Context

```ts
interface ContextResolver {
  collect(
    parsed: ParsedDocument,
    valueSpan: TextSpan,
    rule: DetectorRule
  ): readonly DetectionEvidence[];
}
```

Evidence 必須指出 structural source。Context resolver不得讀其他 document。

---

# 5. Resolve

```ts
function resolveCandidates(
  raw: readonly RawCandidate[],
  priorDecisions: readonly ReviewDecision[],
  policy: ResolutionPolicy
): Result<readonly Candidate[]>;
```

Invariant：

- spans valid
- primary type exists
- alternative types unique
- stricter occurrence handling survives
- Entity stores defaultHandling; occurrences store effective handling
- ambiguity explicit
- prior decision只有 source hash仍有效時可套用

---

# 6. Dictionary

```ts
interface DictionaryService {
  validateImport(bytes: Uint8Array): Result<Dictionary>;
  merge(client: Dictionary, jobOverride: Dictionary): Result<DictionarySnapshot>;
  match(document: ParsedDocument, dictionary: DictionarySnapshot): readonly RawCandidate[];
}
```

不得接受 Regex expression作 dictionary term。

---

# 7. Review Reducer

```ts
function applyReviewDecision(
  state: ReviewState,
  decision: ReviewDecision
): Result<ReviewState>;
```

Reducer：

- deterministic
- validates current candidate version
- records undo operation
- does not write Audit itself
- cannot TOKENIZE Secret/Credit Card

---

# 8. Entity

```ts
function buildEntityGroups(
  candidates: readonly ReviewedCandidate[],
  priorMap: EntityMap | null,
  fingerprint: CanonicalFingerprintProvider
): Result<EntityGrouping>;
```

Auto grouping只能用 `primaryType + deterministic canonical equality`；不能 fuzzy merge。Handling 不作為 Entity identity key，而是由 occurrence 保存有效政策。

---

# 9. Token

```ts
interface TokenService {
  getOrCreate(entity: AcceptedEntity, map: EntityMap): Result<TokenAllocation>;
  parse(value: string): Result<ParsedToken>;
  verify(value: string, job: JobCryptoContext): Result<VerifiedToken>;
}
```

`verify()` 不回傳「MAC valid but not found」差異給 UI。

---

# 10. Tokenize

```ts
function tokenizeDocument(
  document: ScanDocument,
  replacements: readonly ApprovedReplacement[]
): Result<TokenizedDocument>;
```

Preconditions：

- replacements sorted or sortable
- no unresolved overlap
- each sourceTextHash matches
- handling approved

Postconditions：

- source input unchanged
- replacements log complete
- output spans not persisted as source offsets for future source mutation

---

# 11. Residual

```ts
function scanResidualAll(
  document: TokenizedDocument,
  registry: DetectorRegistry,
  dictionary: DictionarySnapshot
): Result<ResidualReport>;
```

不得接受 `minRuleScore`。

---

# 12. Export Guard

```ts
function validateExport(
  job: Job,
  inventory: ResolvedInventory,
  review: ReviewState,
  shadow: ShadowBuildManifest,
  residual: ResidualReport
): ExportValidation;
```

回傳完整 blocker list，不只第一個。

---

# 13. Package

```ts
interface PackageService {
  plan(input: ExportInput): Result<PackagePlan>;
  build(plan: PackagePlan, output: OutputWriter, signal: AbortSignal): Promise<Result<SafePackage>>;
  verify(packageFile: SafePackageFile): Promise<Result<VerifiedSafePackage>>;
}
```

---

# 14. Result

```ts
interface ResultValidator {
  validateBytes(bytes: Uint8Array, limits: ResultLimits): Result<ParsedResultPackage>;
  bindToJob(result: ParsedResultPackage, job: Job, map: EntityMap): Result<ValidatedResultPackage>;
}
```

Schema validation先於 token lookup。

---

# 15. Restore

```ts
function restoreFindings(
  result: ValidatedResultPackage,
  map: EntityMap,
  renderer: SafeResultRenderer
): Result<RestoredFindings>;
```

Renderer只接受 verified token和plain text。

---

# 16. Secure Store

```ts
interface SecureStore {
  initialize(): Promise<Result<StoreRegistry>>;
  createClient(command: CreateClientCommand): Promise<Result<ClientSession>>;
  unlockClient(clientId: ClientId, passphrase: SecretInput): Promise<Result<ClientSession>>;
  lockClient(clientId: ClientId): Promise<Result<void>>;
  createJob(session: ClientSession, command: CreateJobCommand): Promise<Result<Job>>;
  readEncrypted<T>(ref: SecureRecordRef<T>, session: ClientSession): Promise<Result<T>>;
  writeEncrypted<T>(ref: SecureRecordRef<T>, value: T, session: ClientSession): Promise<Result<void>>;
  transact<T>(scope: TransactionScope, action: TransactionAction<T>): Promise<Result<T>>;
}
```

Generic `T` 必須綁定 runtime Schema，不允許任意 JSON。

---

# 17. Audit

```ts
interface AuditSink {
  append(event: NewAuditEvent, session: ClientSession): Promise<Result<AuditReceipt>>;
  verify(clientId: ClientId, session: ClientSession): Promise<Result<AuditVerification>>;
}
```

Audit append 與業務 transaction 必須同一 commit boundary或可證明順序。

---

# 18. State Transition

```ts
function transitionJob(
  job: Job,
  event: JobEvent
): Result<Job>;
```

非法轉換固定回 PB-JOB-002 類型的 domain error，不 silently coerce。


---

# 文件：資料契約

# Data Contracts

**版本：** 1.0.0 LOCKED  
**Schema 數量：** 18  
**規則：** 所有持久化或外部交換資料必須先通過對應 Schema；`additionalProperties: false`。

---

# 1. Schema Catalog

| Schema | 對應資料 | 明文／加密 | 實際檔案 |
|---|---|---|---|
| `store.schema.json` | 最小 Store Registry | 明文、只含 opaque IDs | `store.json` |
| `client-profile.schema.json` | Client Alias、Operator、Job list | 加密 | `client.enc` payload |
| `job.schema.json` | Job state、scope、version、counts | 加密 | `job.enc` payload |
| `job-key-envelope.schema.json` | CRK／JRK／Backup JRK 包裝；`$defs.backupManifest` 定義 `.pbjob` manifest | 已加密 key envelope／backup manifest | `client.key`、`job.key`、`backup-manifest.json` |
| `dictionary.schema.json` | Client／Job dictionary | 加密 | `dictionary.enc` payload |
| `candidate.schema.json` | 單一候選 | 加密 | Detection payload |
| `detection-run.schema.json` | Scan run、documents、candidates | 加密 | `detection.enc` |
| `review-decision.schema.json` | 人工決策 | 加密 | `review.enc` |
| `entity-map.schema.json` | Entity、Token、preferred display | 加密 | `mapping.enc` |
| `occurrence-map.schema.json` | 每次出現、surface form、有效 handling 與 risk | 加密 | `occurrences.enc` |
| `path-map.schema.json` | 原始與 Shadow path 對應 | 加密 | `path-map.enc` |
| `encrypted-envelope.schema.json` | 通用 AES-GCM 容器 | Ciphertext | `*.enc` |
| `transaction-journal.schema.json` | 原子操作 journal | 加密 | `transaction.journal.enc` |
| `lock.schema.json` | 跨程序操作鎖 | 明文、無敏感值 | `lock.json` |
| `audit-event.schema.json` | Audit chain event | 加密 | `audit.enc` |
| `export-manifest.schema.json` | Safe Package manifest | 明文、已假名化 | `manifest.json` |
| `result-package.schema.json` | 外部分析結果 | 不可信明文 | 使用者匯入 JSON |
| `restore-manifest.schema.json` | Result Vault 產生紀錄 | 明文、不含 Mapping | `restore-manifest.json` |

---

# 2. Schema Enforcement

每次讀取：

```text
Read bytes
→ UTF-8／JSON parse
→ Envelope Schema
→ AAD validation
→ Authenticated decrypt
→ Content Schema
→ Semantic validation
→ Use
```

每次寫入：

```text
Construct typed value
→ Content Schema
→ Canonical JSON UTF-8
→ AES-GCM
→ Envelope Schema
→ Temp write
→ Read-back
→ Envelope validation
→ Atomic rename
```

不得直接將 `JSON.parse()` 結果 cast 成 TypeScript interface。

---

# 3. Canonical JSON

只用於 Hash、AAD metadata 與 Audit event hash，不用於使用者 Markdown。

規則：

- UTF-8
- Object keys 依 Unicode code point ascending
- 無空白
- JSON number 只允許有限整數或 Schema 限制的小數
- 禁止 NaN／Infinity
- String 不做 Unicode normalization
- Date 使用 RFC 3339 UTC `Z`
- Array order 保留

採用固定 `canonicalStringify()`，不得依賴 JavaScript object insertion order 作安全 Hash。

---

# 4. IDs

| ID | 格式 | 產生 |
|---|---|---|
| Store／Client／Device／Candidate／Run／Entity／Occurrence／Decision／Event／Transaction／Lock | UUIDv4 lowercase | CSPRNG |
| Job ID | `PB-YYYYMMDD-XXXXXXXXXX` | 日期＋10 Crockford random |
| Document ID | UUIDv4 | Job 建立 inventory 時 |
| Token Entity ID | 16 Crockford chars | 10 random bytes |
| Token Tag | 20 Crockford chars | 12-byte HMAC truncation |
| Finding ID | UUIDv4，由外部產生 | Strict unique validation |

ID 不得由原始姓名、路徑或檔案內容直接推導。

---

# 5. Limits

| 資料 | Limit |
|---|---:|
| Job documents | 100,000 |
| Candidates | 1,000,000 |
| Occurrences | 5,000,000 |
| Dictionary entries | 50,000 |
| Aliases per entry | 20 |
| Term／alias | 256 code points |
| Safe Package | 2 GB |
| Result JSON | 100 MB |
| Findings | 100,000 |
| Entity refs per finding | 1,000 |
| Summary | 20,000 chars |
| Evidence excerpt | 5,000 chars |
| Relative path | 4,096 chars |

超過限制整包阻擋，不做部分截斷後繼續。

---

# 6. External Contract Rules

## Export

- `manifest.json` 與所有 package files 先自我驗證。
- `packageHash` 固定為所有 payload entries（排除 `manifest.json` 與 `checksums.json`）的 `(normalized path, size, SHA-256)` 依 path 排序後做 canonical JSON，再取 SHA-256。這避免 manifest 自我遞迴。
- `checksums.json` 保存相同 payload entry hashes。
- 發佈 ZIP container bytes 另產生外部 SHA-256，顯示給使用者；此值不放入 ZIP 內部 manifest 的 `packageHash` 欄位。
- `sourceSnapshotHash` 是 sorted `(documentId, sourceSha256)` 的 canonical hash。

## Result

- `sourcePackageHash` 必須對應 Export Manifest 的 `packageHash`。
- 不允許 unknown fields。
- 不允許 duplicate findingId。
- 不允許 unknown documentId。
- `summary` 與 `evidence.excerpt` 是 plain text。
- 任何 `⟦PB:` 開頭序列都必須完整符合 Token grammar並屬於當前 Job。

---

# 7. Schema Change

任何 Schema PR 必須：

1. 說明 backward／forward compatibility。
2. 版本升級。
3. 修改 examples。
4. 修改 validator tests。
5. 修改 migration。
6. 修改 Acceptance Matrix。
7. 修改 Master Spec，只有 Change Request 允許。
8. 不得以 `additionalProperties: true` 暫時繞過。


---

# 文件：密碼學規格

# Cryptographic Specification

**版本：** 1.0.0 LOCKED  
**禁止實作者自行更改參數。**

---

# 1. Primitives

| Purpose | Primitive | Parameters |
|---|---|---|
| Passphrase KDF | scrypt | N=131072, r=8, p=1, dkLen=32, maxmem=256 MiB |
| Root/data encryption | AES-256-GCM | 32-byte key, 12-byte IV, 16-byte tag |
| Domain key derivation | HKDF-SHA-256 | 32-byte output |
| Token authentication | HMAC-SHA-256 | truncate first 12 bytes |
| Canonical fingerprint | HMAC-SHA-256 | full 32 bytes inside encrypted Mapping |
| File hash | SHA-256 | lowercase hex |
| Random | OS CSPRNG | Node `randomBytes` equivalent |

---

# 2. Key Hierarchy

```text
Client Passphrase
  └─ scrypt(salt) → KEK
       └─ AES-GCM unwrap → CRK
            ├─ HKDF(client-profile) → client profile key
            ├─ HKDF(dictionary) → dictionary key
            ├─ HKDF(client-audit) → client audit key
            └─ HKDF(job-wrap + jobId) → Job Wrap Key
                  └─ AES-GCM unwrap → JRK
                       ├─ HKDF(job-data) → Job Data Key
                       ├─ HKDF(token-auth) → Token Auth Key
                       ├─ HKDF(audit-chain) → Job Audit Key
                       ├─ HKDF(package-auth) → Package Auth Key
                       └─ HKDF(canonical-fingerprint) → Fingerprint Key
```

固定 HKDF Info：

```text
PB/v1/client-profile
PB/v1/dictionary
PB/v1/client-audit
PB/v1/job-wrap
PB/v1/job-data
PB/v1/token-auth
PB/v1/audit-chain
PB/v1/package-auth
PB/v1/canonical-fingerprint
```

Client-level HKDF Salt：

```text
SHA-256("PrivacyBridge|1|" + storeId + "|" + clientId)
```

Job-level HKDF Salt：

```text
SHA-256("PrivacyBridge|1|" + clientId + "|" + jobId)
```

---

# 3. Envelope

Base64url 無 padding。

```json
{
  "envelopeVersion": "PBENC1",
  "contentSchema": "...",
  "contentVersion": "1.0.0",
  "keyId": "...",
  "recordType": "ENTITY_MAP",
  "cipher": {
    "algorithm": "AES-256-GCM",
    "iv": "...",
    "ciphertext": "...",
    "authTag": "..."
  },
  "aad": {
    "storeId": "...",
    "clientId": "...",
    "jobId": "...",
    "recordType": "ENTITY_MAP",
    "canonical": "..."
  },
  "createdAt": "..."
}
```

Canonical AAD bytes：

```text
PBENC1\0<storeId>\0<clientId>\0<jobId-or-empty>\0<contentSchema>\0<contentVersion>\0<recordType>
```

讀取時必須重新計算 canonical AAD，不信任 envelope 內的 `canonical` 字串。

---

# 4. Token

```text
⟦PB:<TYPE>:<ID>:<TAG>⟧
```

```text
ID = CrockfordBase32(randomBytes(10))      // 16 chars
payload = "PB|1|" + jobId + "|" + TYPE + "|" + ID
TAG = CrockfordBase32(HMAC-SHA256(tokenKey, payload)[0:12]) // 20 chars
```

驗證順序：

1. Grammar
2. Type enum
3. HMAC constant-time compare
4. Mapping lookup
5. Handling policy

錯誤訊息不區分 HMAC 失敗與 Mapping 不存在。

---

# 5. Passphrase Handling

- 不 normalize。
- 轉 UTF-8 後交給 scrypt。
- UI 隱藏輸入。
- 不 trim；前後空格是 Passphrase 的一部分，UI 必須提示。
- 建立時輸入兩次。
- 不提供 hint。
- 不送 Clipboard。
- 派生完成後 best-effort overwrite Buffer。
- JavaScript immutable string 無法保證清除；Threat Model 明確列為 residual risk。

---

# 6. IV Policy

每次 AES-GCM encrypt 都呼叫 CSPRNG 產生新 12-byte IV。不得：

- 使用 timestamp
- 使用 counter 代替 random
- 從 record ID Hash
- 重用 test vector IV
- 在 retry 中重用 prior IV

測試使用固定 IV 只能出現在 `crypto-test-vectors.json` 與 test code。

---

# 7. Constant-time Operations

Token tag、Hash chain與 key verification 使用 constant-time compare。不得以普通字串 `===` 比較秘密 MAC。

---

# 8. Key Rotation

v1 只支援：

- Passphrase rewrap CRK
- Backup passphrase rewrap JRK

不提供自動 CRK／JRK rotation。若未來輪替 JRK，必須視為 major migration，因為 Token 與已匯出資料會受影響。

---

# 9. Test Vector

`examples/crypto-test-vectors.json` 鎖定：

- scrypt KEK
- CRK wrap ciphertext／tag
- Job wrap key
- JRK wrap ciphertext／tag
- Job data／token keys
- Token ID／tag／完整 Token
- Data envelope ciphertext／tag

所有平台必須完全一致。


---

# 文件：檔案與 Markdown 規格

# File and Markdown Processing Specification

**版本：** 1.0.0 LOCKED

---

# 1. Inventory Algorithm

```text
resolve approved root
→ lstat root
→ recursively lstat entries without following links
→ fixed system exclusion
→ nested vault detection
→ extension classification
→ encoding probe
→ case/Unicode path collision
→ size and hash
→ inventory review
```

排序固定使用 normalized relative path 的 Unicode code point order，確保重跑一致。

---

# 2. System Exclusion

Case-insensitive match on Windows/macOS default file systems；case-sensitive Linux仍以明確名稱排除：

```text
.obsidian
.trash
.git
privacy-bridge staging
Secure Store realpath
Shadow realpath
Result realpath
```

不以單純字串 prefix 判斷；使用 path segment 與 realpath。

---

# 3. Markdown Regions

Parser 輸出 Span，不能重寫文件：

```ts
type Region =
  | 'FRONTMATTER_KEY'
  | 'FRONTMATTER_VALUE'
  | 'BODY_TEXT'
  | 'TABLE_CELL'
  | 'CODE_FENCE'
  | 'INLINE_CODE'
  | 'HTML_COMMENT'
  | 'WIKILINK_TARGET'
  | 'WIKILINK_DISPLAY'
  | 'TAG'
```

每個 Region：

- start/end UTF-16
- line/column for UI only
- structural parent ID
- context labels
- source hash

---

# 4. Context Scope

## label-value

支援：

```text
標籤：值
label: value
label = value
```

只在同行。Label 本身不包含於 value capture。

## YAML

以 property path 作 context，例如 `customer.email`。不跨 sibling property。

## Table

Header 對同 column cells 提供 context。Row label 可對同行 cell 提供 secondary context。

## Code

JSON property只在可安全解析的 JSON fenced code中使用；其他 code 只使用 same-line label evidence，不執行 code。

## Paragraph

段落以空行分隔。Paragraph evidence權重低於 same-line，不能把純數字提升為高證據護照。

---

# 5. Output Preservation

- 讀取 bytes，偵測 BOM／line ending。
- decode UTF-8。
- 建立 UTF-16 spans。
- replacement 從 end desc。
- encode UTF-8。
- restore BOM。
- 不 normalize Unicode。
- 不 normalize line ending。
- 不加 trailing newline。
- 不重新排序 frontmatter。
- 不改 Markdown quote style。

---

# 6. Filename Mapping

Path segments 可個別 Tokenize。若檔名含多個敏感項目，產生 opaque segment：

```text
DOC-<6-digit-sequence>.md
DIR-<6-digit-sequence>/
```

Sequence 只在 Shadow Path Map 中決定，不反映 Entity ID。避免從檔名推測人物數量或類型。

Path Map 加密保存；Safe Package 可看到 sanitized path。

---

# 7. Link Rewrite

解析：

```text
[[target]]
[[target|display]]
[[target#heading]]
[[target^block]]
![[target]]
```

- Embed 與 link 都更新 target。
- Heading／block suffix 保留。
- display independently tokenized。
- External markdown link URL 由 URL rule處理；不把 link label當 path。
- Unresolved link在 build validation列為 warning；若原始即 unresolved且無改動，可人工接受；若由 Path Map造成則 blocker。

---

# 8. Unsupported and Large Files

單一 Markdown 最大 100 MB。超過：

- 列為 blocker
- v1 不分塊處理
- 使用者拆分或排除

空檔合法，產生零 Candidate。

---

# 9. Source Read-only Enforcement

Vault Adapter interface只提供：

```ts
list()
readBytes()
stat()
realpath()
```

不提供 `write`、`modify`、`rename`、`delete`。Shadow Output 使用完全不同 adapter type，避免誤傳 source handle。


---

# 文件：UX 狀態表

# UX State Map

**版本：** 1.0.0 LOCKED  
**目的：** 鎖定每個畫面的狀態、按鈕、預設值、錯誤與轉換，避免工程師自行補產品決策。

---

# 1. 全域 UX 規則

## UX-GLOBAL-001　主導覽

左側 Ribbon 只新增一個 Privacy Bridge 圖示。點擊後開啟右側 Workspace View。Command Palette 提供：

- Privacy Bridge: Open dashboard
- Privacy Bridge: Scan current note
- Privacy Bridge: Create new job
- Privacy Bridge: Lock current client
- Privacy Bridge: Resume interrupted job

## UX-GLOBAL-002　版面

Desktop 寬度：

- 最小 360 px
- 預設 480 px
- 可拖曳
- 低於 420 px 時切成單欄
- Diff Preview 使用獨立全寬 Modal

## UX-GLOBAL-003　高風險操作

下列操作必須二次確認，確認按鈕預設不取得 focus：

- 批次忽略
- Redact Secret
- 排除整份文件
- 建立 Safe Package
- 匯入 Backup
- 刪除 Job secrets
- 刪除 Client
- Roll-forward recovery
- 清除完整輸出

## UX-GLOBAL-004　Loading

所有超過 300 ms 的操作顯示：

- 目前階段
- 已完成／總數
- 可取消與否
- 取消後的資料狀態
- 不顯示不可靠的剩餘時間估計

## UX-GLOBAL-005　Empty State

每個空畫面必須說明下一步。例如：

- 沒有 Client：建立第一個 Client
- 沒有 Job：建立 Job
- 沒有候選：確認是否已完成掃描，並查看低分候選
- 沒有 Result：選擇外部分析 JSON

## UX-GLOBAL-006　敏感文字

Review 中顯示原文是必要功能，但：

- 預設只顯示命中前後各一行
- 不在 Toast／Notice 顯示原文
- 不在頁面標題顯示客戶或原始檔名
- 切換到其他 Job 時立即清除畫面中的敏感內容
- Client 鎖定後所有原文改為遮罩

---

# 2. Welcome / Security Notice

## 目的

首次啟動揭露安全邊界，完成 Operator Alias 與 Secure Store 初始化。

## 狀態

| State | 顯示 | 可操作 |
|---|---|---|
| FIRST_RUN | 安全說明、資料流、限制 | Continue |
| STORE_CHECK | 預設 Secure Store 路徑與安全檢查 | Choose another safe path / Continue |
| OPERATOR_SETUP | Operator Alias | Save |
| READY | Client Dashboard | Create client |

## 固定文案重點

- 本工具為可逆假名化，不是匿名化。
- 自動偵測不能保證找出所有敏感資料。
- 其他 Obsidian 外掛可能讀取同一 Vault。
- 建議使用專用 Vault／Profile，並關閉 Sync。
- 外掛不包含網路功能。
- 原始 Vault 不會被修改。

使用者必須勾選「我理解以上限制」才可繼續。此同意只記錄布林值與版本，不記錄姓名。

---

# 3. Client Manager

## List Item

顯示：

- Client Alias
- Client 狀態
- Job 數量
- 最後解鎖時間
- Locked／Unlocked
- Dictionary version

不得顯示：

- Secure Store 絕對路徑
- Passphrase
- 原始客戶名稱以外的資料

## Actions

| Action | 前置 | 結果 |
|---|---|---|
| Create client | Store ready | 開啟 Client Wizard |
| Unlock | Locked | Passphrase Modal |
| Lock | Unlocked | 清除 keys、關閉敏感 views |
| Archive | Unlocked、無 active operation | Client read-only |
| Backup | Unlocked | Backup Wizard |
| Delete | Unlocked、無 active operation | Destructive confirmation |

## Unlock Error

- 第 1–4 次：顯示 `PB-CRYPTO-001`
- 第 5 次：30 秒本機延遲
- 不顯示是 Passphrase 錯誤或檔案損毀的細節差異，避免 oracle
- 提供「從 Backup 還原」入口

---

# 4. Create Client Wizard

## Steps

1. Client Alias
2. Client Passphrase
3. Confirm Passphrase
4. Security Summary
5. Create

## Defaults

- Alias 必填，1–80 字元
- Passphrase 12–256 code points
- 顯示強度提示但不阻擋長 passphrase
- 不提供「顯示建議密碼並自動保存」
- Create 後自動 unlock
- Client Alias 只存在 encrypted profile

## Error

- Secure Store 不可寫：停止，不建立半成品
- Key write 失敗：刪除 staging
- Alias 重複：允許，Client ID 仍不同；UI 顯示 opaque suffix 以區分

---

# 5. Job Dashboard

## Card Fields

- Job Display Name
- Job ID
- State
- Source scope type
- Document count
- Candidate count
- Pending count
- Block count
- Last operation
- Rules version

## Primary Action by State

| State | Primary action |
|---|---|
| DRAFT | Continue setup |
| INVENTORY_REQUIRED | Review inventory |
| SCANNING | Open progress |
| REVIEW_REQUIRED | Continue review |
| READY_TO_BUILD | Build shadow vault |
| BUILDING_SHADOW | Open progress |
| RESIDUAL_REVIEW | Review residuals |
| READY_TO_EXPORT | Export safe package |
| EXPORTED | Import result |
| RESULT_IMPORTED | Validate result |
| READY_TO_RESTORE | Restore |
| RESTORING | Open progress |
| RESTORED | Open result vault |
| ARCHIVED | View read-only |
| BLOCKED | Resolve blocker |
| FAILED | Open recovery |

## Secondary Actions

- View audit summary
- Backup
- Archive
- Delete outputs
- Delete job secrets

---

# 6. New Job Wizard

## Step 1 — Basic

Fields:

- Job name：必填，1–100 字元
- Client：目前已解鎖 Client，不能跨 Client
- Optional project label：加密保存
- Source type：Active Note／Folder／Whole Vault／External Folder

## Step 2 — Source

- Vault path 以相對路徑顯示
- External path 只在畫面顯示 basename；完整路徑加密
- 禁止選擇 Secure Store、Shadow、Result、Sync／Network path
- 選擇後立即 inventory

## Step 3 — Inventory

顯示：

- Supported Markdown
- Unsupported
- Symlink／Junction
- Nested Vault
- Non-UTF-8
- System excluded
- Total size

按鈕：

- Exclude all unsupported
- Review individually
- Back
- Continue

Continue 只有所有 blockers resolved 時啟用。

## Step 4 — Dictionary

- Client Dictionary 預設啟用
- Job Override 預設空
- 可新增詞彙
- 不允許從 Vault 內明文檔案直接持續連結
- 匯入字典會複製並加密到 Secure Store

## Step 5 — Summary

顯示：

- Scope
- Included／Excluded counts
- Dictionary version
- Security boundaries
- Job ID preview

Create 後進入 Scan。

---

# 7. Scan Progress

## Display

- Phase：Hashing／Parsing／Detecting／Grouping／Persisting
- Current document sanitized relative label
- Completed／total
- Candidates by risk
- Errors
- Cancel

## Cancel

取消後 Modal 顯示：

> 已完成結果會加密保留；尚未完成的文件下次繼續。尚未建立 Shadow Vault，也不能匯出。

Confirm 後取消。不得中斷正在進行的單一 atomic write。

---

# 8. Review Workspace

## Layout

- 左：Filters／Entity list
- 中：Occurrence context
- 右：Decision／Evidence

## Filters

- Block
- Ambiguous
- High
- Medium
- Low
- Accepted
- Ignored
- Modified
- Type
- Rule
- Document
- Dictionary／Pattern
- Search by current visible text；搜尋字串不得寫入 persistent log

## Entity Header

- Suggested type
- Alternative types
- Occurrence count
- Rule score range
- Risk flags
- Handling
- Review status

## Decision Buttons

- Accept suggestion
- Change type
- Tokenize
- Redact
- Block export
- Ignore
- Merge
- Split
- Add to client dictionary
- Add to job override
- Add exact ignore

## Defaults

- Block／Ambiguous 自動排最前
- 低分收合但數量永遠可見
- 不自動接受
- 切換 Entity 時自動保存 encrypted draft decision
- Undo stack 只保存在 encrypted Job state

## Ignore Confirmation

單筆 Ignore 不二次確認，但必填 Reason Code：

- False positive
- Not sensitive for this job
- Public information
- Test／placeholder
- Other

選 Other 時需要 1–200 字註記，註記加密保存。

---

# 9. Merge / Split

## Merge

顯示兩個 Entity：

- Types
- Occurrences
- Preferred display
- Dictionary source

使用者選擇：

- Primary type
- Preferred display
- Handling 取較嚴格者，不可降低 Block
- Alias mapping

## Split

使用者逐筆勾選 occurrences。至少一筆移到新 Entity。Split 後兩邊都回到 `PENDING`，避免沿用錯誤決策。

---

# 10. Diff Preview

## View

- Side-by-side default
- Inline optional
- Original left，sanitized right
- Changed spans highlighted
- Type／handling badges
- Previous／next change
- Filter by type
- Open in Review

## Security

- Client lock 時立即清空
- 不允許 Export Diff as plaintext
- 可輸出 encrypted diagnostic snapshot，但 v1 UI 不提供此功能

---

# 11. Shadow Build

## Progress

- Snapshot revalidation
- Token mapping
- File writing
- Link rewrite
- Link validation
- Hashing
- Residual scan

若 source changed：

- 停止 build
- 刪除 staging
- 顯示變更檔案
- Job 回 SCANNING

---

# 12. Residual Review

與 Review Workspace 類似，但固定篩選 Residual。每筆顯示：

- Sanitized context
- Why still detected
- Original decision reference
- Suggested fix

Action：

- Return to original review
- Add new redaction
- Mark accepted residual with reason
- Exclude document

「Accepted residual」仍需二次確認，因為這會允許疑似敏感資料出現在 Safe Package。

---

# 13. Export Summary

顯示：

- Job ID
- File count
- Token count by type
- Excluded count
- Residual accepted count
- Source snapshot hash prefix
- Estimated package size
- Output location basename
- Security statement

按鈕：

- Build package
- Back to review

建立完成後顯示：

- Package filename
- SHA-256
- Open folder
- Copy checksum

不得提供 Upload。

---

# 14. Result Import

## Step 1

Select JSON；預先檢查 size、UTF-8、JSON parse。

## Step 2 Validation Summary

- Schema
- Job ID
- Source package hash
- Findings count
- Token count
- Unknown tokens
- Unsafe content
- Document references

任一 blocking error 時：

- 不顯示 Restore
- 可下載安全錯誤報告；報告不含 Result 原文，只含 code 與 counts

## Step 3

Import valid result into encrypted Job store；State → RESULT_IMPORTED。

---

# 15. Restore Preview

顯示：

- Findings list
- Token restored preview
- Preferred display source
- Sanitization warnings
- Output folder

按鈕：

- Generate Result Vault
- Cancel

Result Vault 既存時：

- 產生帶 sequence 的新目錄
- 不覆寫
- UI 可讓使用者刪除舊輸出，但需確認

---

# 16. Backup / Recovery

## Backup Wizard

1. 選擇 Job
2. Backup Passphrase
3. Confirm
4. Output location
5. Build
6. 顯示 checksum

## Recovery Wizard

States：

- Stale lock detected
- Journal inspection
- Rollback recommended
- Roll-forward available only if verified
- Completed／Failed

預設按鈕永遠是 Rollback。

---

# 17. Delete

## Delete Outputs

可個別選：

- Shadow
- Result
- Safe Package

## Delete Job Secrets

顯示不可逆警告，要求輸入完整 Job ID。刪除：

- job.key
- job.enc
- detection
- review
- mapping
- occurrence
- path map
- audit job entries
- recovery snapshots

不刪原始 Vault。完成後 Job 從 Dashboard 移除。

## Delete Client

需先刪除或匯出所有 Jobs。輸入 Client Alias 與最後 6 碼 Client ID。不得提供 Undo。

---

# 18. Settings

可設定：

- Language
- UI review threshold；預設 0.7，範圍 0.0–1.0
- Auto lock minutes；v1 固定 15，不提供更改
- Dense／comfortable layout
- Show low-score section expanded

不可設定：

- Export safety threshold
- Disable review
- Disable residual scan
- Allow network
- Remember passphrase
- Follow symlink
- Store mapping in Vault


---

# 文件：威脅模型

# Threat Model

**版本：** 1.0.0 LOCKED  
**方法：** Asset／Trust Boundary／Abuse Case／STRIDE 混合  
**適用版本：** Privacy Bridge GitHub Alpha  
**Review Gate：** Gate B 與 Gate D

---

# 1. Security Objectives

依優先順序：

1. 原始資料不被修改或非預期洩漏。
2. Mapping、字典、Passphrase 與 Key 不離開 Secure Store／memory boundary。
3. Safe Package 不含可重識別資料。
4. 外部 Result 不能觸發未授權還原、程式執行或路徑寫入。
5. Job、Client 與 Token 不能跨邊界混用。
6. 操作可稽核，Audit 本身不含明文。
7. Crash、升級與部分寫入不造成資料毀損。
8. Supply chain 與其他 Obsidian 外掛的風險被清楚揭露。

---

# 2. Protected Assets

| Asset | 敏感度 | 儲存 | 主要保護 |
|---|---|---|---|
| 原始 Vault | Critical | 使用者指定路徑 | Read-only、snapshot、no overwrite |
| External source folder | Critical | Vault 外 | Read-only、path boundary |
| Client Passphrase | Critical | 僅短暫記憶體 | 不保存、不記錄、auto-lock |
| CRK | Critical | `client.key` 中加密 | scrypt KEK＋AES-GCM |
| JRK | Critical | `job.key` 中由 CRK 包裝 | Client isolation |
| Mapping | Critical | `mapping.enc` | Job data key＋AES-GCM |
| Dictionary | Critical | `dictionary.enc` | Client key＋AES-GCM |
| Occurrence surface text | Critical | `occurrences.enc` | Job data key |
| Review decisions | High | `review.enc` | Job data key |
| Audit | High | `audit.enc` | Audit key＋hash chain |
| Path Map | High | `path-map.enc` | Job data key |
| Shadow Vault | Medium | 使用者輸出 | No mapping、residual scan |
| Safe Package | Medium | 使用者輸出 | No raw values、hash |
| Result JSON | Untrusted | 外部 | Schema／token／content validation |
| Result Vault | Medium | 使用者輸出 | Safe rendering |
| Store registry | Low | `store.json` | Opaque IDs only |
| Lock file | Low | `lock.json` | Opaque metadata only |

---

# 3. Trust Boundaries

## TB-01　Original Source Boundary

原始 Vault／External Folder 與 Plugin 之間。Plugin 只讀，任何寫入嘗試視為 P0 defect。

## TB-02　Obsidian Process Boundary

Privacy Bridge 與其他 Community Plugins 共用程序與權限。這是無法由外掛完全隔離的 residual risk。

## TB-03　Secure Store Boundary

Vault 外 encrypted storage。任何寫入必須 atomic、schema-validated、authenticated encryption。

## TB-04　Memory Key Boundary

Unlocked CRK／JRK／Derived Keys 僅在 process memory。OS compromise 不在 v1 可完全防護範圍。

## TB-05　Shadow / Export Boundary

資料離開 Secure Store前必須完成 Review、Residual、Export Guard。

## TB-06　External Analysis Boundary

Safe Package 進入不可信環境。假設對方可以讀取、修改、刪除、重排所有內容。

## TB-07　Result Import Boundary

外部 JSON 回到本機。視為惡意輸入，整包 strict validation。

## TB-08　GitHub / Supply Chain Boundary

Source、dependency、release bundle 可能遭污染。透過 lockfile、review、SBOM、bundle scan、checksum 緩解。

---

# 4. Threat Actors

| Actor | 能力 |
|---|---|
| 惡意雲端分析服務 | 讀取 Safe Package、回傳任意 JSON、猜測 Token |
| 被攻陷的雲端帳號 | 取得 Safe Package 與 Result |
| 其他 Obsidian 外掛 | 讀取 Vault、網路傳輸、修改 UI 或 process state |
| 惡意 npm dependency | 執行任意程式碼、讀檔、開 socket |
| 同機其他使用者 | 讀取可存取檔案、觀察輸出、取得備份 |
| 遺失裝置的攻擊者 | 離線取得 Secure Store 與 Vault |
| 誤操作使用者 | 批次忽略、選錯輸出、刪除 Mapping |
| 惡意 Result 作者 | Token injection、path traversal、HTML／URI injection、DoS |
| 惡意字典提供者 | 超大條目、Regex-like payload、Unicode spoofing |
| 開發者錯誤 | IV reuse、錯誤 offset、stale decision、plaintext log |
| 被污染 Release | Bundle 與 source 不一致、秘密網路路徑 |

---

# 5. Out of Scope / Assumptions

以下不是 Privacy Bridge 能單獨防禦的情況，但必須在 README 揭露：

- OS kernel 或 administrator 已完全控制
- 使用者主動提供 Passphrase
- 惡意外掛與 Privacy Bridge 在同一 Obsidian process 中讀取原始 Vault
- 螢幕錄影、鍵盤側錄、記憶體 forensic
- 原始 Vault 本身已被同步到公有雲
- SSD／檔案系統安全抹除保證
- 雲端透過資料語意重新推測身分
- 使用者人工接受了實際敏感 residual
- 外部服務違反其合約或保留政策

---

# 6. Threat Register

| ID | Threat | STRIDE | Impact | Required mitigation | Test / Gate |
|---|---|---|---|---|---|
| TH-001 | Plugin 直接修改原始 Vault | Tampering | Critical | Read-only adapter、source hash、no write API | ACC-FND-003 |
| TH-002 | Mapping 被寫入 Vault | Information Disclosure | Critical | Secure Store path check、CI search、integration test | ACC-STR-003 |
| TH-003 | Dictionary 被 Sync | Information Disclosure | Critical | Vault 外 encrypted dictionary | ACC-STR-004 |
| TH-004 | Passphrase 寫入 data.json | Information Disclosure | Critical | No persistence、memory-only | ACC-STR-008 |
| TH-005 | IV reuse | Information Disclosure | Critical | CSPRNG 12-byte IV、property test、journaled counter not used | ACC-TOK-010 |
| TH-006 | 錯誤密碼覆寫 key | Tampering | Critical | Decrypt before write、copy-on-write | ACC-STR-010 |
| TH-007 | Token 猜測造成 Mapping oracle | Spoofing | Critical | HMAC tag、unknown token whole-package reject | ACC-IMP-003 |
| TH-008 | Cross-job token 還原 | Elevation | Critical | Job-derived token key、jobId in MAC | ACC-IMP-004 |
| TH-009 | Result path traversal | Tampering | Critical | No external paths、normalized IDs | ACC-IMP-005 |
| TH-010 | HTML／script injection | Elevation | High | Plain text rendering、escape output | ACC-IMP-006 |
| TH-011 | Obsidian URI command injection | Elevation | High | Do not parse or auto-open URI | ACC-IMP-007 |
| TH-012 | Secret 被可逆 Tokenize | Information Disclosure | Critical | Secret handling excludes TOKENIZE | ACC-DET-017 |
| TH-013 | 低分候選被 UI 隱藏後匯出 | Information Disclosure | Critical | detectAll＋Export Guard all candidates | ACC-DET-002 |
| TH-014 | Residual 使用 UI threshold | Information Disclosure | Critical | scanResidualAll no threshold | ACC-EXP-006 |
| TH-015 | Context 跨行誤判護照 | Tampering | Medium | Structured context、no default newline crossing | ACC-DET-006 |
| TH-016 | Capture offset 指到 label | Information Disclosure | Critical | RegExp indices、golden tests | ACC-DET-005 |
| TH-017 | Overlap 丟失 Block flag | Information Disclosure | Critical | risk merge、alternativeTypes | ACC-DET-009 |
| TH-018 | Symlink 逃離 root | Information Disclosure | Critical | lstat、realpath boundary、no follow | ACC-FIL-005 |
| TH-019 | Nested Vault 被意外掃描或漏掃 | Information Disclosure | High | blocker／separate Job | ACC-FIL-006 |
| TH-020 | 非 UTF-8 錯誤解碼 | Tampering | High | block, no auto-convert | ACC-FIL-008 |
| TH-021 | 掃描後檔案變更 | Tampering | Critical | rehash before build、stale decisions | ACC-FIL-011 |
| TH-022 | Shadow staging 部分檔案被當完整輸出 | Tampering | High | atomic directory publish | ACC-EXP-003 |
| TH-023 | ZIP slip | Tampering | Critical | normalized relative entries | ACC-EXP-009 |
| TH-024 | Safe Package 包含原始路徑 | Information Disclosure | High | Document IDs、sanitized paths only | ACC-EXP-010 |
| TH-025 | Audit log 含原文 | Information Disclosure | High | allowlisted fields、encrypted | ACC-OPS-001 |
| TH-026 | Audit 被刪改 | Repudiation | High | Hash chain、sequence verification | ACC-OPS-002 |
| TH-027 | Stale lock 被誤判並並行寫入 | Tampering | High | PID＋process start＋journal inspection | ACC-OPS-003 |
| TH-028 | Migration 半完成 | Tampering | Critical | copy-on-write、recovery snapshot | ACC-OPS-004 |
| TH-029 | Backup 內含 plaintext | Information Disclosure | Critical | `.pbjob` encrypted, scan archive | ACC-OPS-005 |
| TH-030 | Dependency 偷偷連網 | Information Disclosure | Critical | lockfile、bundle scan、runtime deny | ACC-FND-007 |
| TH-031 | Release bundle 與 source 不一致 | Tampering | High | reproducible workflow、commit metadata、checksum | ACC-OPS-006 |
| TH-032 | Dictionary Unicode spoof | Spoofing | Medium | NFC、visible codepoint warning, exact match | ACC-REV-006 |
| TH-033 | 批次忽略造成大量漏判 | Information Disclosure | High | examples＋confirm＋audit＋undo | ACC-REV-008 |
| TH-034 | Client unlocked unattended | Information Disclosure | High | 15-min auto-lock、sleep lock | ACC-STR-009 |
| TH-035 | Original value 出現在 console | Information Disclosure | Critical | production console ban、safe errors | ACC-FND-005 |
| TH-036 | Huge Result JSON DoS | Denial of Service | High | size、count、depth limits before parse/use | ACC-IMP-008 |
| TH-037 | Huge dictionary DoS | Denial of Service | Medium | entry/length limits、streamed import validation | ACC-REV-011 |
| TH-038 | Token-like malformed string bypass | Spoofing | High | detect any PB delimiter, strict reject | ACC-IMP-002 |
| TH-039 | Source path case collision | Tampering | High | case-normalized collision inventory | ACC-FIL-010 |
| TH-040 | Secure Store 在網路磁碟 | Information Disclosure | Critical | mount/path safety deny | ACC-STR-002 |

---

# 7. Abuse Cases

## AC-01　惡意雲端捏造 Token

雲端回傳一個看似合法但不存在於 Mapping 的 Token，企圖探測是否會還原。系統必須先驗 HMAC，再查 Mapping；任一失敗整包拒絕，錯誤訊息不區分「MAC 錯」或「不存在」。

## AC-02　雲端複製另一個 Job 的 Token

Token MAC 綁定 Job ID 與 Job Token Key，因此驗證失敗，整包拒絕。

## AC-03　Result 內嵌 Obsidian URI

Summary 包含 `obsidian://` 或 Markdown link。UI 以 text node 顯示；Result Markdown 安全 escape，不自動建立可點擊 command。

## AC-04　字典檔帶入 100 萬筆資料

Import 在解密／複製前先檢查檔案大小，stream validate；v1 限制：

- 50,000 entries
- 每 term 1–256 code points
- 每 entry 最多 20 aliases
- 檔案最大 25 MB

超過整包拒絕。

## AC-05　使用者選到 Dropbox Secure Store

Path safety checker 依 known sync directory、mount type 與 parent marker 拒絕。v1 不提供 override。

## AC-06　Crash 正在更換 Passphrase

舊 `client.key` 保持 active，新 key 在 temp；只有新 key 成功解密 CRK 並驗證 client.enc 後才原子切換。Crash 後預設 Rollback。

## AC-07　其他外掛讀取原始 Vault

Privacy Bridge 無法防止。首次啟動、README 與 Threat Model 明確警告，企業建議專用 Profile／allowlist。這是 residual risk，不可隱藏。

---

# 8. Security Test Requirements

Release 必須包含：

- Static source network scan
- Production bundle network scan
- Runtime network-deny
- Secret log test
- Secure Store path escape test
- Symlink／junction test
- AES-GCM tamper test
- Wrong passphrase no-overwrite test
- Token forgery property test
- Cross-job token test
- Result JSON fuzz
- ZIP slip test
- Crash at every transaction phase
- Migration rollback
- Audit chain tamper
- Dependency SBOM and license scan
- Manual review by a reviewer who did not author the crypto/storage code

---

# 9. Residual Risks

Alpha README 必須列出：

1. Regex 與字典仍可能漏掉語意型敏感資訊。
2. 人工忽略可能允許敏感內容進入 Safe Package。
3. 其他 Community Plugin 可能讀取原始 Vault。
4. Shadow Vault 雖不含 Mapping，仍可能透過內容語意重新識別。
5. 裝置解鎖且 Client 已解鎖時，具有同程序權限的惡意程式可能讀取記憶體。
6. 刪除 encrypted file 不等於物理安全抹除。
7. GitHub Alpha 不等於完成企業資安認證。

---

# 10. Security Sign-off

Gate B 需要：

- Tech Lead
- Security Reviewer
- QA Owner

三者均完成 `RELEASE-CHECKLIST.md` 對應項目。Product Owner 不需要重新決定已鎖定的技術細節。


---

# 文件：遷移與復原

# Migration and Recovery Specification

**版本：** 1.0.0 LOCKED  
**範圍：** Secure Store、Client、Job、Encrypted Envelope、Export、Result、Backup  
**原則：** 任何升級或復原都不得直接覆寫唯一可用資料。

---

# 1. Version Model

每一層有獨立版本：

| Layer | Field | v1 |
|---|---|---|
| Plugin | `pluginVersion` | SemVer |
| Store registry | `schemaVersion` | `1.0.0` |
| Client profile | `schemaVersion` | `1.0.0` |
| Job | `schemaVersion` | `1.0.0` |
| Encrypted envelope | `envelopeVersion` | `PBENC1` |
| Mapping | `schemaVersion` | `1.0.0` |
| Dictionary | `schemaVersion` | `1.0.0` |
| Audit | `schemaVersion` | `1.0.0` |
| Export package | `schemaVersion` | `1.0.0` |
| Result package | `schemaVersion` | `1.0.0` |
| Backup package | `schemaVersion` | `1.0.0` |

## Compatibility

- Patch：完全向後相容；可直接讀。
- Minor：同 major、已知 minor 以下可讀；需要 migration 時顯示 Wizard。
- Major：不自動開啟寫入模式。只能 read-only diagnostics 或執行明確 Migration Wizard。
- 新版 Result minor 高於支援值：拒絕，不忽略未知欄位。
- 降版讀取新版 Secure Store：顯示 `PB-MIG-002`，不得建立空資料覆寫。

---

# 2. Migration Principles

## MIG-001　Copy-on-write

任何 migration：

1. Client 解鎖。
2. 驗證現有全部 envelope、schema、hash。
3. 建立 encrypted internal recovery snapshot。
4. 建立 `.migration/<migration-id>/staging/`。
5. 只在 staging 轉換。
6. 驗證每一份新資料。
7. 寫入 migration manifest。
8. 原子切換 active pointer／directory。
9. 啟動後重新讀取驗證。
10. 標記 migration committed。
11. 保留 recovery snapshot，直到使用者下一次成功開啟並確認。

禁止 in-place migration。

## MIG-002　Deterministic

Migration function：

```ts
migrate(input, fromVersion, toVersion): output
```

必須純函式或在固定 adapter 內可重現。相同輸入產生相同結構；隨機欄位由 migration context 注入並寫入 manifest。

## MIG-003　No silent data loss

未知欄位、未知 enum 或無法解析資料：

- 整個 migration 停止
- 保留原資料
- 產生安全錯誤報告
- 不「忽略後繼續」

## MIG-004　Key Material

Schema migration 不重新生成：

- CRK
- JRK
- Entity Token ID

除非專門的 key rotation migration 明確要求。一般 migration 不應改變現有 Token，避免已匯出的資料失效。

---

# 3. Internal Recovery Snapshot

## Contents

```text
recovery/<timestamp>-<migration-id>/
├── recovery-manifest.enc
├── client.key.copy
├── affected-files/
└── checksums.enc
```

- 使用現有 Client／Job Key 加密。
- 只存在 Secure Store。
- 不包含原始 Vault。
- Migration commit 後保留至少到下一次成功開啟。
- Alpha 不自動清除最後一份成功前 snapshot。
- 最多保留最近 3 份；刪除較舊 snapshot 需先確認新 active 可解密。

---

# 4. Transaction Journal

每個 mutation 使用 `transaction.journal.enc`。

## Phases

```text
PREPARED
WRITING_TEMP
TEMP_VALIDATED
SWAP_PENDING
SWAPPED
POST_VALIDATION
COMMITTED
ROLLBACK_PENDING
ROLLED_BACK
FAILED
```

## Step

每個 step 保存：

- stepId
- operation
- target relative identifier
- temp relative identifier
- prior hash
- expected new hash
- state
- createdAt／updatedAt
- safe error code

Journal 不含原始資料或絕對路徑。

## Crash Decision

| Last phase | Default action |
|---|---|
| PREPARED | Rollback |
| WRITING_TEMP | Rollback |
| TEMP_VALIDATED | Rollback |
| SWAP_PENDING | Rollback |
| SWAPPED | 驗證 target；若完整可 Roll-forward，預設仍 Rollback |
| POST_VALIDATION | 若全部驗證通過可 Roll-forward |
| COMMITTED | 清理 stale temp |
| ROLLBACK_PENDING | 繼續 Rollback |
| FAILED | 保留證據，要求 Recovery Wizard |

---

# 5. Lock Recovery

`lock.json` Heartbeat 每 10 秒更新。

視為 stale candidate 必須同時成立：

- `heartbeatAt` 超過 60 秒
- PID 不存在，或 process start time 不符
- 相同 deviceId 沒有 active Obsidian instance ownership confirmation

復原流程：

1. 不直接刪 lock。
2. 讀取 encrypted journal；若 Client locked，先請使用者解鎖。
3. 顯示 operation 與最後 phase，不顯示原文。
4. 執行 Rollback 或已驗證 Roll-forward。
5. 完成後寫 Audit。
6. 最後刪 lock。

---

# 6. Scan Recovery

掃描每完成一個 document batch 即寫 encrypted checkpoint：

- runId
- completed document IDs
- pending document IDs
- candidate count
- source snapshot hashes
- rules version
- dictionary version

Resume 時：

- 重新驗證 completed files 的 Hash。
- 變更文件重新掃描。
- 未變更結果可重用。
- Rules 或 Dictionary version 改變時，整個 Run 標記 stale 並重新掃描。

---

# 7. Shadow Build Recovery

Shadow 使用 staging：

```text
.<job-id>.shadow-staging-<transaction-id>/
```

Crash 後：

- 未發布 staging 預設刪除。
- 已有 final Shadow 不覆寫。
- 若 staging 全部 Hash 與 link validation 通過，可在 Recovery Wizard 選擇發布，但預設重新建置。
- 不從部分 Shadow 直接建立 Safe Package。

---

# 8. Passphrase Change Recovery

流程：

1. 驗證 current Passphrase。
2. 產生新 Salt 與 KEK。
3. 以新 KEK 包裝同一 CRK 至 temp。
4. 使用 temp 解出 CRK。
5. 用 CRK 驗證 `client.enc` 與至少一個 Job。
6. 原子替換 `client.key`。
7. Commit。
8. 清理舊 temp。

任何失敗保留舊 `client.key`。不在同一檔案上 overwrite。

---

# 9. Job Backup `.pbjob`

## 建立

1. Client unlocked。
2. 使用者輸入獨立 Backup Passphrase 兩次。
3. 固定 scrypt 參數，產生新 Salt。
4. 以 Backup KEK 包裝 JRK。
5. 複製 Job encrypted records。
6. 產生 `backup-manifest.json`。
7. 檔案級 SHA-256。
8. 建 ZIP staging。
9. 自我解壓與驗證。
10. 原子發布 `.pbjob`。

## Package

```text
backup-manifest.json
job-root-key.backup-envelope.json
job/
  job.enc
  detection.enc
  review.enc
  mapping.enc
  occurrences.enc
  path-map.enc
  transaction.journal.enc
checksums.json
```

不包含：

- Client Passphrase
- CRK
- Client dictionary，除非建立 Job-specific dictionary snapshot；該 snapshot 以 JRK 加密
- 原始／Shadow／Result／Safe Package

## 匯入

1. 先檢查 ZIP path safety 與大小。
2. 驗證 manifest／checksums。
3. 輸入 Backup Passphrase。
4. 解出 JRK。
5. 解密並驗證所有 Job records。
6. 選擇已解鎖 Client 或建立新 Client。
7. 以目標 CRK 重新包裝 JRK。
8. 如果 Job ID 已存在：
   - Hash 完全相同：顯示已存在，不重複匯入。
   - 不同：建立新 Job ID，並重新產生全部 Token 是不允許的；v1 直接拒絕，要求先封存或刪除衝突 Job。
9. Commit。
10. 清除 Backup Passphrase／KEK。

---

# 10. Mapping Loss

## `mapping.enc` 損毀但 `job.key` 正常

- Job 進入 `BLOCKED`
- 不建立空 Mapping
- 嘗試 internal recovery snapshot
- 可從 `.pbjob` 還原
- 無任何備份時不可還原已匯出的 Token
- 原始 Vault仍不受影響

## `job.key` 損毀

- 嘗試 internal snapshot 或 `.pbjob`
- 不重新生成 JRK
- 不建立同 Job ID 的新 key
- 無備份時 Job 永久不可還原

## Client Passphrase 遺失

- 無 reset
- 無 recovery question
- 無 vendor backdoor
- 只有 `.pbjob`＋Backup Passphrase 可以把個別 Job 匯入新 Client

---

# 11. Delete Policy

## Outputs

刪除 Shadow、Result、Safe Package只影響輸出。刪除前顯示路徑 basename 與檔案數。

## Job Secrets

需要：

- Client unlocked
- 沒有 active operation
- 輸入完整 Job ID
- 勾選「我理解 Token 將永久無法還原」

刪除順序：

1. 建立 deletion audit intent
2. 刪除 JRK envelope `job.key`
3. 刪除 encrypted Job records
4. 刪除 recovery
5. 刪除 lock／journal
6. 更新 Client profile
7. 寫入 Client-level deletion tombstone，不含原文

先刪 key 代表殘留 ciphertext 不可解密。不得宣稱實體位元安全抹除。

## Client

- 必須無 active Job
- 必須先處理所有 Job
- 需要 Alias＋Client ID suffix
- 先刪 `client.key`
- 再刪 encrypted profile／dictionary／audit
- 更新 `store.json`

---

# 12. Archive

Archive：

- 不刪任何安全資料
- Job read-only
- 不再允許 Scan／Review／Build
- 可以 Import Result、Restore、Backup
- Unarchive 需要 Client unlocked，並重新驗證 source snapshot；若來源不存在，仍可 Restore 已匯出 Token

---

# 13. Plugin Upgrade and Rollback

## Upgrade

Alpha 由使用者手動替換 release files。Plugin 啟動：

1. 讀取 store schema。
2. 僅列出 opaque Client。
3. 需要 migration 時，在解鎖前只顯示版本與安全說明。
4. 解鎖後執行 Migration Wizard。
5. Migration 失敗，舊 Plugin 可重新安裝並讀舊資料。

## Rollback

- Plugin binary rollback 不自動 downgrade data。
- 若 data 已升級至舊 Plugin 不支援版本，舊 Plugin顯示 read-only error。
- Recovery snapshot可用於手動回復，但必須由新版 Migration Wizard 或專用 recovery command 執行。
- 不讓舊版建立空 Store。

---

# 14. Recovery Acceptance

Release blocker：

- 每一個 Journal phase 模擬 crash
- Wrong Passphrase no overwrite
- Corrupt ciphertext no overwrite
- Stale lock recovery
- Shadow staging cleanup
- Scan resume with changed file
- Migration fail before swap
- Migration fail after swap
- Backup import wrong password
- Backup ZIP slip
- Job ID collision
- Missing mapping
- Missing job key
- Downgrade error
- Client deletion no original Vault effect


---

# 文件：錯誤目錄

# Error Catalog

**版本：** 1.0.0 LOCKED  
**原則：** UI 訊息可翻譯；Error Code 固定。一般使用者看不到 Stack Trace 或敏感值。

| Code | Title | Trigger | User Action | Blocking |
|---|---|---|---|---|
| PB-PLATFORM-001 | 不支援的執行環境 | Mobile 或缺少必要 Desktop API | 使用支援的 Obsidian Desktop | Yes |
| PB-STORE-001 | Secure Store 路徑不安全 | Vault／Sync／Network／Output 路徑 | 選擇 OS 本機安全路徑 | Yes |
| PB-STORE-002 | Store 格式不支援 | store schema/version invalid | 使用支援版本或 Recovery | Yes |
| PB-STORE-003 | Secure Store 無法寫入 | 權限／空間／I/O | 修正權限或路徑 | Yes |
| PB-LOCK-001 | Job 正在使用 | Active valid lock | 關閉另一個操作 | Yes |
| PB-LOCK-002 | 發現中斷操作 | Stale lock＋journal | 開啟 Recovery Wizard | Yes |
| PB-CRYPTO-001 | 無法解鎖 | Passphrase 錯或 key 損毀 | 重試或從 Backup 恢復 | Yes |
| PB-CRYPTO-002 | 加密資料驗證失敗 | GCM tag／AAD fail | Recovery／Backup | Yes |
| PB-CRYPTO-003 | 密碼不符合要求 | 長度超界 | 輸入 12–256 code points | Yes |
| PB-CRYPTO-004 | 密碼變更失敗 | Rewrap／validation fail | 舊密碼仍有效，重試 | No |
| PB-FILE-001 | 有不支援檔案 | Inventory unresolved | 排除清單或外部轉換 | Yes |
| PB-FILE-002 | 不是 UTF-8 | Encoding unsupported | 外部轉成 UTF-8 或排除 | Yes |
| PB-FILE-003 | 發現 Link／Nested Vault | Symlink/junction/nested vault | 排除或另建 Job | Yes |
| PB-FILE-004 | 原始檔案已變更 | Hash mismatch | 重新掃描 | Yes |
| PB-FILE-005 | 路徑越界 | realpath outside root／traversal | 排除來源 | Yes |
| PB-FILE-006 | 路徑衝突 | Case／normalization collision | 重新命名來源或排除 | Yes |
| PB-SCAN-001 | 掃描部分失敗 | Parser／I/O error | 查看安全錯誤清單、重試 | Yes |
| PB-SCAN-002 | 掃描版本過期 | Rules/dictionary changed | 重新掃描 | Yes |
| PB-REVIEW-001 | 尚有未審核候選 | Pending > 0 | 繼續 Review | Yes |
| PB-REVIEW-002 | 尚有歧義候選 | Ambiguous pending | 選擇正確類型／範圍 | Yes |
| PB-REVIEW-003 | 決策已過期 | Source／entity changed | 重新確認 | Yes |
| PB-EXPORT-001 | 存在阻擋資料 | Secret／credit card unresolved | Redact、排除或回原文移除 | Yes |
| PB-EXPORT-002 | Residual 未處理 | scanResidualAll hits | Review residuals | Yes |
| PB-EXPORT-003 | Shadow 驗證失敗 | Hash／link／content fail | 重新建置 | Yes |
| PB-EXPORT-004 | Package 太大 | >2 GB | 縮小 Job，另建 Job | Yes |
| PB-EXPORT-005 | Package 自我驗證失敗 | ZIP/readback/hash fail | 重新建立；檢查磁碟 | Yes |
| PB-IMPORT-001 | Result 格式錯誤 | JSON／Schema invalid | 要求外部服務重產 | Yes |
| PB-IMPORT-002 | Job 或 Package 不符 | ID/hash mismatch | 選擇正確 Result | Yes |
| PB-IMPORT-003 | Token 無法驗證 | Unknown/forged/cross-job | 整包拒絕，要求重產 | Yes |
| PB-IMPORT-004 | Result 內容不安全 | path/control/unsafe construct | 整包拒絕 | Yes |
| PB-IMPORT-005 | Result 超過限制 | size/count/depth | 請外部拆分或減少 | Yes |
| PB-RESTORE-001 | Mapping 未解鎖 | Client locked | 解鎖 Client | Yes |
| PB-RESTORE-002 | Result 輸出失敗 | I/O／collision | 選擇安全輸出路徑 | Yes |
| PB-AUDIT-001 | Audit Chain 損毀 | hash/sequence fail | Recovery／Security review | Yes |
| PB-MIG-001 | Migration 失敗 | staging validation fail | Rollback，保留舊版本 | Yes |
| PB-MIG-002 | 資料版本太新 | Downgraded plugin | 安裝相容新版 | Yes |
| PB-BACKUP-001 | Backup 無法驗證 | password/hash/schema/zip fail | 選正確 Backup 或重建 | Yes |
| PB-DELETE-001 | 無法刪除 | Active lock／I/O | 關閉操作後重試 | No |
| PB-PERF-001 | 資料量超過 v1 限制 | Schema limits | 拆分 Job | Yes |

## Safe Technical Details

可複製的 Diagnostic 只包含：

- Error Code
- Plugin version
- Schema version
- OS family
- Job ID
- opaque Document ID
- counts
- hashes prefix（最多 12 hex）
- operation
- timestamp

不得包含：

- 原文
- 絕對路徑
- Client Alias
- Operator Alias
- Passphrase／key
- Dictionary term
- Token 對應值


---

# 文件：測試計畫

# Test Plan

**版本：** 1.0.0 LOCKED

---

# 1. Test Corpus Policy

所有提交到 GitHub 的測試資料只能是：

- 完全合成
- 官方公開示例
- 明確不可對應真實人的格式測試值

不得提交：

- 真實客戶資料
- 真實員工名冊
- 真實 API Key
- 從客戶文件改幾個字的「匿名」資料
- 真實內部路徑與主機名

每個 fixture 需有 `PROVENANCE.md`。

---

# 2. Directory

```text
test-corpus/
├── regression/
├── golden/
├── malformed/
├── security/
└── performance/
```

## regression

臺灣規則與 legacy seed。

## golden

Input、review decisions、expected Shadow、expected Result。

## malformed

Invalid UTF-8、bad JSON、bad Schema、path collision metadata。

## security

Token forgery、ZIP slip、HTML／URI、symlink、audit tamper、cipher tamper。

## performance

由 generator 建立，不提交大型二進位檔。

---

# 3. Required Test Types

## Unit

Pure functions：validator、canonicalization、span、token、schema、state reducer。

## Regression

每個修正 bug 必須有永久案例，註明 Requirement ID。

## Golden

Byte-level Markdown output。

## Property-based

- random Unicode spans
- overlap invariants
- token grammar/uniqueness
- IV uniqueness
- canonicalization idempotence
- path normalization remains under root

## Fuzz

- Result JSON
- Dictionary import
- ZIP metadata
- Markdown parser
- Token-like strings

## Integration

完整 Job lifecycle with temporary Vault／Store。

## Recovery

每個 transaction phase注入 crash。

## Security

Network deny、log canary、source write trap、tamper。

## Performance

固定 generator seed與 hardware metadata。

---

# 4. Precision / Recall Evaluation

79 或 105 個測試通過不代表準確率。Beta 前建立標註的合成企業語料，按類型計算：

- Precision
- Recall
- F1
- candidates per 1,000 chars
- low-score candidates per 1,000 chars
- review time per document
- residual rate

v1 Alpha只宣稱規則覆蓋，不宣稱企業資料實際召回率。

---

# 5. Release Test Order

```text
schema
→ unit
→ regression
→ golden
→ property
→ integration
→ recovery
→ security
→ fuzz
→ performance
→ clean install
```

任何 blocker失敗，Release停止；其他修復工作可並行。


---

# 文件：外部分析契約

# External Analysis Contract

**版本：** 1.0.0 LOCKED  
**對象：** 接收 Safe Package 的分析程式、AI Agent 或外部服務  
**注意：** Privacy Bridge 不負責上傳；此文件定義外部處理後必須回傳的格式。

---

# 1. Input Rules

外部分析端只應讀取 Safe Package 中：

- `manifest.json`
- `schema.json`
- `notes/*.md`
- `entity-index.json`
- `checksums.json`

不得要求：

- Mapping
- 客戶字典
- 原始文件
- 原始檔名
- Passphrase
- Key
- Privacy Bridge Secure Store

---

# 2. Token Rules

Token 是 opaque reference：

```text
⟦PB:<TYPE>:<ID>:<TAG>⟧
```

外部分析端必須：

- 原樣保留完整 Token
- 不拆分、改寫、翻譯或縮短
- 不自行產生新 Token
- 不把兩個 Token 合併成一個
- 需要提及實體時，在 `entityRefs` 引用
- Summary 可包含 Token，但只能使用輸入中已存在的 Token

外部端不能知道 Token 對應原文。

---

# 3. Output

只回傳單一 UTF-8 JSON，符合 `schemas/result-package.schema.json`。

```json
{
  "schemaVersion": "1.0.0",
  "jobId": "PB-20260825-0123456789",
  "sourcePackageHash": "...",
  "createdAt": "2026-08-25T08:10:00Z",
  "producer": "Analyzer name",
  "findings": [
    {
      "findingId": "uuid-v4",
      "entityRefs": ["⟦PB:PERSON:...:...⟧"],
      "category": "relationship",
      "summary": "該實體與另一實體具有合作關係。",
      "sourceDocumentIds": ["uuid-v4"]
    }
  ]
}
```

---

# 4. Result Restrictions

- 不加入未定義欄位
- 不回傳 Markdown file
- 不回傳 HTML
- 不回傳 ZIP
- 不回傳路徑
- 不回傳程式碼
- 不回傳 Obsidian URI
- 不回傳 binary／base64 attachment
- 不使用控制字元
- 不引用 Safe Package 中不存在的 documentId
- 不引用不存在的 Token
- findingId 必須唯一 UUIDv4
- `category` 只用 ASCII letters、digits、dot、underscore、hyphen

---

# 5. Recommended Analyzer Instruction

```text
Analyze only the provided sanitized Markdown files.

Treat every token matching ⟦PB:TYPE:ID:TAG⟧ as an opaque entity reference.
Never alter, abbreviate, translate, split, merge, or invent tokens.

Return only JSON conforming exactly to the provided result-package schema.
Use only document IDs and tokens found in the package.
Do not include paths, HTML, Markdown files, executable content, or extra fields.
The sourcePackageHash and jobId must be copied exactly from manifest.json.
```

---

# 6. Failure Handling

若外部端無法完成：

- 回傳零 findings 的合法 Result Package，或
- 不產生檔案

不得回傳部分 JSON、錯誤 HTML 頁面或文字說明冒充 Result Package。


---

# 文件：實作計畫

# Implementation Plan

**版本：** 1.0.0 LOCKED  
**目的：** 固定實作順序、相依性、Merge Gate 與可並行工作。工程師不得因一般細節中斷詢問。

---

# 1. Execution Rules

1. 一個 PR 只處理一個可驗收單位。
2. PR 必須列出 Requirement ID、Acceptance ID 與 tests。
3. 不得先做 UI 再補資料契約。
4. 不得直接把 legacy recognizer 的 `Entity` 型別當成新 Candidate API。
5. Schema 先於 persistence code 合併。
6. Crypto test vectors 先於 Secure Store 寫入功能合併。
7. 所有 mutation 先實作 transaction／atomic write adapter。
8. STOP blocker 只阻擋受影響 Gate；其他 Epic 繼續。
9. 每完成一個 Epic，更新 traceability。
10. 新需求一律標記 `v1.1-backlog`。

---

# 2. Dependency Graph

```text
E00
 ├─ E01
 │   ├─ E03
 │   ├─ E04
 │   ├─ E05
 │   └─ E06
 ├─ E02
 │   ├─ E06
 │   ├─ E07
 │   └─ E13
E03 → E04 → E05 → E06 → E07 → E08 → E09 → E10 → E11 → E12
E02 ────────────────────────────────┘
E13 depends on E02, E06, E11, E12
E14 depends on E03–E13 stable interfaces
E15 depends on all functional epics
E16 depends on Gates A–D
```

可並行：

- E02 Secure Store 與 E03 File Inventory 在 E01 後並行。
- E04 Detection 與 E02 可並行。
- Documentation／threat test scaffolding 全程並行。
- UI shell 可在 E01 後建立，但不能實作未穩定資料流。

---

# 3. Epic E00 — Repository and CI

## Goal

建立不包含產品邏輯的可重現開發骨架。

## Tasks

- pnpm workspace
- TypeScript strict configs
- esbuild plugin build
- Vitest
- fast-check
- ESLint／Prettier
- JSON Schema validator
- GitHub Actions
- lockfile verification
- SBOM generation
- secret scan
- license scan
- source／bundle network scan
- PR／Issue templates
- CODEOWNERS
- SECURITY.md
- release artifact script

## Output

```text
packages/core
packages/obsidian-plugin
packages/schemas
```

## Acceptance

ACC-FND-001–ACC-FND-008

## Merge Gate

- Empty plugin opens
- CI passes on macOS／Windows runners where available
- Production bundle generated without runtime network code

---

# 4. Epic E01 — Schemas and Core Types

## Goal

將 18 份 Schema 轉為 TypeScript types 與 runtime validation。

## Tasks

- Schema catalog
- Generated or hand-maintained TS types
- Runtime validators
- Semantic version parser
- Branded IDs
- ErrorResult
- Result／Option utilities
- Clock／Random／Crypto interfaces
- JSON canonical serializer for AAD／hash inputs
- Crockford Base32 codec
- UTF-16 span utilities

## Output APIs

```ts
parseStore()
parseClientProfile()
parseJob()
parseCandidate()
parseExportManifest()
parseResultPackage()
```

## Acceptance

ACC-FND-002、ACC-FND-004、ACC-TOK-001、ACC-IMP-001

## Merge Gate

- 18 Schema valid
- Examples pass
- `additionalProperties: false`
- no Core dependency on Obsidian

---

# 5. Epic E02 — Secure Store and Key Hierarchy

## Goal

完成 Client／Job key lifecycle 與 encrypted storage，先不接 UI。

## Tasks

- Default OS path resolver
- Unsafe path detection
- Store registry
- Client create／unlock／lock
- scrypt async
- Client key envelope
- Job key wrap
- HKDF domain keys
- AES-GCM envelope
- atomic file writer
- lock file
- transaction journal
- auto-lock controller
- memory key zeroing best effort
- crypto vectors
- tamper／wrong password tests

## Acceptance

ACC-STR-001–ACC-STR-012、ACC-TOK-009–ACC-TOK-012

## Merge Gate

- Cross-platform crypto vector identical
- Wrong password never overwrites
- Tampered ciphertext rejected
- Secure Store cannot be inside Vault／sync path

---

# 6. Epic E03 — File Inventory and Snapshot

## Goal

安全列舉來源並建立 immutable scan snapshot。

## Tasks

- Vault adapter read-only
- External folder adapter
- include／exclude rules
- fixed system excludes
- hidden Markdown inclusion
- unsupported inventory
- symlink／junction detection
- nested Vault detection
- UTF-8／BOM detection
- LF／CRLF detection
- case collision
- SHA-256 snapshot
- documentId generation
- path boundary checks
- source changed detection

## Acceptance

ACC-FIL-001–ACC-FIL-012

## Merge Gate

- No write method exposed by source adapter
- Symlink escape test passes
- Unsupported files cannot silently continue

---

# 7. Epic E04 — Detection and Context Refactor

## Goal

將 legacy rules 重構成 `detectAll` 與結構化 Evidence。

## Tasks

- Legacy rules imported as seed
- `confidence` → `ruleScore`
- named capture groups／indices
- structured context parser
- no default cross-line context
- `TW_PHONE_SERVICE`
- passport two-tier model
- address modular parser
- postal code before city
- URL／LINE／Secret value-only capture
- detector registration
- deterministic Candidate IDs per run
- property tests
- all legacy regression tests retained or explicitly superseded

## Acceptance

ACC-DET-001–ACC-DET-020

## Merge Gate

- `password: password` captures value
- context line contamination test passes
- detectAll has no threshold
- no source mutation

---

# 8. Epic E05 — Candidate Resolution and Dictionary

## Goal

完成多候選、字典、Entity Group、merge／split。

## Tasks

- Candidate model
- overlap graph
- primary／alternative type
- risk flag union
- handling severity
- client dictionary
- job override
- NFC exact matcher
- longest-first
- alias
- ignore entry
- entity grouping
- canonical fingerprint
- split／merge
- dictionary import limits

## Acceptance

ACC-REV-001–ACC-REV-012、ACC-DET-008–ACC-DET-010

## Merge Gate

- Invoice／ARC ambiguity retained
- Block risk survives overlap
- dictionary never stored in Vault
- no fuzzy matching

---

# 9. Epic E06 — Review State and Audit

## Goal

建立可續跑、可 Undo、可稽核的人工決策。

## Tasks

- ReviewDecision reducer
- entity-level accept
- occurrence split
- batch decisions
- reason codes
- encrypted review persistence
- audit event chain
- operator alias fingerprint
- undo until build
- stale decision invalidation
- audit chain verifier

## Acceptance

ACC-REV-002–ACC-REV-010、ACC-OPS-001–ACC-OPS-002

## Merge Gate

- No auto accept
- batch action requires count／examples／confirm
- audit contains no raw values
- tampered audit blocks Job

---

# 10. Epic E07 — Token, Mapping, Occurrence

## Goal

完成 Job-scoped tokenization 與可逆 Mapping。

## Tasks

- Entity random ID
- Token HMAC tag
- token parser／verifier
- canonical fingerprint
- entity map
- occurrence map
- preferred display
- handling policy
- reverse-order replacement
- source span hash validation
- cross-job rejection
- forged token tests

## Acceptance

ACC-TOK-001–ACC-TOK-015

## Merge Gate

- Same Job same Entity same token
- Cross Job different token
- Forgery rejected
- Secret never gets reversible token
- original source unchanged

---

# 11. Epic E08 — Markdown and Path Map

## Goal

保留 Markdown 結構並安全重新命名 Shadow paths。

## Tasks

- region parser
- frontmatter spans
- table cells
- code spans／blocks
- comments
- Wikilink parser
- alias／heading／block ref
- filename tokenization
- path map
- link rewrite
- UTF-16 offsets
- line ending／BOM preservation
- Golden fixtures

## Acceptance

ACC-EXP-001–ACC-EXP-005

## Merge Gate

- No full-document reserialization
- Golden output byte-exact except intended spans
- All Shadow links resolve

---

# 12. Epic E09 — Shadow Vault

## Goal

建立 staging、驗證與 atomic publish。

## Tasks

- shadow build planner
- staging path
- write／hash
- link integrity
- source revalidation
- transaction journal
- cancel／cleanup
- existing output sequence policy
- no mapping scan
- output inventory

## Acceptance

ACC-EXP-001–ACC-EXP-005

## Merge Gate

- Source changed returns to Scan
- Partial build never appears as complete
- Shadow contains no secure files

---

# 13. Epic E10 — Residual and Export Guard

## Goal

任何未處理風險都無法越過匯出。

## Tasks

- `scanResidualAll`
- residual review
- accepted residual reason
- export preconditions
- disabled reason list
- safe counts
- gate state machine
- re-build affected files

## Acceptance

ACC-EXP-006–ACC-EXP-008

## Merge Gate

- Low-score residual blocks
- UI threshold cannot affect guard
- all failures have explicit error code

---

# 14. Epic E11 — Safe Package

## Goal

建立可驗證、不含 Mapping 的 ZIP。

## Tasks

- export manifest
- entity index
- checksums
- schema copy
- normalized ZIP entries
- package size limit
- staging／self-read validation
- package SHA-256
- export audit

## Acceptance

ACC-EXP-009–ACC-EXP-012

## Merge Gate

- ZIP slip tests
- package content allowlist
- raw path scan
- self-validation passes

---

# 15. Epic E12 — Result Validation and Restore

## Goal

嚴格驗證不可信 Result JSON，再產生安全 Result Vault。

## Tasks

- file size limits
- strict JSON schema
- token-like sequence parser
- Job／package hash
- token HMAC
- document refs
- duplicate IDs
- plain-text renderer
- Markdown escape
- preferred display restore
- result manifest
- sequence output directory

## Acceptance

ACC-IMP-001–ACC-IMP-008

## Merge Gate

- Unknown／cross-job token rejects whole package
- malicious HTML／URI remains inert
- no original or Shadow overwrite

---

# 16. Epic E13 — Backup, Migration, Recovery

## Goal

所有中斷、升級與備份均不毀損資料。

## Tasks

- `.pbjob`
- backup key wrap
- backup self-validation
- import to target Client
- copy-on-write migration
- recovery snapshot
- stale lock wizard
- every journal phase test
- passphrase change
- deletion flows
- archive

## Acceptance

ACC-OPS-003–ACC-OPS-005

## Merge Gate

- Crash matrix passes
- backup wrong password no writes
- migration rollback works
- deletion does not touch source

---

# 17. Epic E14 — Obsidian UX Integration

## Goal

依 UX State Map 實作所有畫面，不改 Core 行為。

## Tasks

- Ribbon／commands
- Client Manager
- Job Dashboard
- Wizards
- progress
- Review virtualized list
- merge／split
- Diff
- Residual
- Export
- Import／Restore
- Recovery
- Settings
- i18n
- accessibility

## Acceptance

對應全部 UX 與 workflow acceptance。

## Merge Gate

- Keyboard-only complete workflow
- screen-reader labels
- disabled reason
- client lock clears sensitive UI

---

# 18. Epic E15 — Hardening

## Tasks

- network-deny integration
- production console scan
- fuzz Result／ZIP／dictionary
- property token tests
- performance benchmark
- memory review
- dependency audit
- SBOM
- threat model walkthrough
- independent crypto/storage review
- macOS／Windows manual matrix

## Gate

Gate A、B、C 全部完成。

---

# 19. Epic E16 — GitHub Alpha

## Tasks

- README
- install
- limitations
- demo vault
- demo result
- SECURITY
- changelog
- release notes
- checksums
- SBOM
- source commit
- signed tag where available
- release archive
- clean-machine install test
- rollback test
- Alpha banner

## Gate

105 Acceptance release blockers全部通過。Gate D sign-off。

---

# 20. GitHub Issue Format

每個 Issue：

```text
Title
Epic
Requirement IDs
Acceptance IDs
Dependencies
Input
Output
Errors
Security impact
Tests
Done conditions
Out of scope
```

不得在 Issue 中發明新需求。

---

# 21. Pull Request Format

```text
Spec IDs:
Acceptance IDs:
Change:
Data contract impact:
Security impact:
Migration impact:
Tests added:
Manual verification:
Artifacts:
Known limitations:
```

Schema 變更必須：

- 修改 Schema version
- 更新 examples
- 更新 Acceptance
- 更新 migration
- 新增 backward compatibility test

---

# 22. AI Coding Agent Loop

每個 Task 固定循環：

1. 讀 Master Spec 對應段落。
2. 讀 Schema。
3. 讀 Acceptance。
4. 讀既有 tests。
5. 寫 failing test。
6. 實作最小安全方案。
7. 跑局部 tests。
8. 跑全 CI。
9. 更新 traceability。
10. 建 PR。
11. 自動選下一個 dependency-ready Task。

沒有產品問題可問。只遇到 STOP-01–04 時建立 blocker，並繼續其他 Task。


---

# 文件：工程執行協議

# Engineer Execution Protocol

**狀態：** LOCKED  
**適用：** 人類工程師、Tech Lead、QA、AI Coding Agent  
**目的：** 讓實作不中斷，不把規格內可推導的問題丟回 Product Owner。

---

# 1. 啟動指令

將以下文字與本規格套件一起交給工程師或 AI Coding Agent：

> 依 `docs/MASTER-SPEC.md` 與 `docs/IMPLEMENTATION-PLAN.md`，按 E00 至 E16 的相依順序持續開發。不得因一般產品、UI 或技術細節等待回覆。遇到未明確描述的事項，依安全優先順序採用最保守、可逆、最少外洩的方案並記錄 ADR。只有 STOP-01 至 STOP-04 可以阻擋 Release；即使發生，仍須繼續所有不受影響的工作。每個 PR 必須對應 Requirement ID、Acceptance ID 與自動化測試。不得把 legacy seed 當成規格來源。

---

# 2. 每個工作單位的必讀順序

```text
MASTER-SPEC 對應 Requirement
→ Schema
→ Acceptance row
→ Golden fixture
→ Decision Register
→ Threat Model
→ Existing implementation
```

若 Existing implementation 不一致，修改 implementation，不修改規格。

---

# 3. 自行決策演算法

```text
是否影響敏感資料外洩？
  是 → 選擇更嚴格方案
否
是否可能修改／毀損原始資料？
  是 → 改為 copy-on-write／read-only
否
是否可能造成錯誤還原或跨 Job？
  是 → fail closed
否
是否改變 Schema／Token／Crypto？
  是 → 依已鎖定契約；不得自行替換
否
是否可在一天內逆轉且不影響 Acceptance？
  是 → 選最簡單方案並寫 ADR
否
是否為 v1 新功能？
  是 → 放 v1.1-backlog，不實作
否
依既有 codebase 慣例實作
```

---

# 4. 不得詢問的問題

不得因以下內容等待：

- 「這個按鈕放左邊還右邊？」
- 「變數叫什麼？」
- 「要用哪個等價的本機套件？」
- 「錯誤訊息要不要關閉？」
- 「低分候選要不要顯示？」
- 「要不要直接修改原文？」
- 「Mapping 能不能放 Vault？」
- 「Secret 要 Tokenize 還是 Block？」
- 「Result 可以不可以收 Markdown？」
- 「測試失敗要不要先跳過？」
- 「新功能要不要順便做？」

答案已由 UX、Decision Register 或安全優先順序固定。

---

# 5. 必須回報但不等待的情況

- 發現規則漏判案例
- 發現效能低於 target
- 發現第三方套件停止維護
- 發現 UI 可用性問題
- 發現 v1.1 機會
- 發現測試資料不足
- 發現可簡化內部實作但不改契約

回報格式：

```text
Observation:
Impact:
Decision taken:
Spec / Acceptance IDs:
Tests:
Backlog follow-up:
```

然後繼續。

---

# 6. STOP Blocker

只有：

- STOP-01 Original data destruction risk
- STOP-02 Sensitive data／key leakage risk
- STOP-03 Unsafe migration
- STOP-04 Platform API impossible

Blocker 格式：

```text
Stop code:
Evidence:
Affected release gate:
Safest temporary behavior:
Work that continues:
Proposed permanent fix:
Spec sections:
Tests required:
```

不得寫成開放式 A／B 選擇題。

---

# 7. ADR 規則

需要 ADR：

- 替換等價套件
- Platform adapter 差異
- Internal module boundary
- Performance optimization
- 可逆 UI 實作細節
- 不改資料契約的測試工具

不得用 ADR 改變：

- Product Scope
- Crypto parameters
- Token format
- Schema required fields
- Security Gate
- File support
- Review requirement
- No-network policy

---

# 8. Code Rules

- TypeScript strict，不使用未說明的 `any`
- Core 純邏輯不得依賴 Obsidian
- 每個外部輸入先 parse／validate
- 每個持久化檔案先 Schema validate
- 所有 sensitive data 只在 encrypted store 或最短生命週期記憶體
- 不 log 原文
- 不使用 dynamic code execution
- 不使用 `eval`／`new Function`
- 不使用 runtime package download
- 不使用 remote fonts／assets
- 不使用 `child_process`，除非安全測試工具且不進 production bundle
- source adapter 不提供 write API
- output adapter 不接受 absolute path from external input
- Crypto code 必須有 vector test
- Error 必須使用 catalog code

---

# 9. Test-first Rules

P0／security 工作：

1. 先新增會失敗的測試。
2. 確認測試確實捕捉 bug。
3. 實作。
4. 局部測試。
5. 全測試。
6. Negative／tamper test。
7. Traceability。

禁止為了讓舊測試通過而保留與 Master Spec 衝突的行為。被規格取代的舊 assertion 必須重寫並在 test comment 標示 superseded Requirement ID。

---

# 10. 自動續作

完成 PR 後，從 Implementation Plan 找出：

- dependencies 已完成
- acceptance 已定義
- 沒有 STOP blocker

的最低 Epic／Task ID，直接開始。

不得回覆「下一步要做什麼？」。

---

# 11. 完成宣告格式

```text
Completed:
Requirement IDs:
Acceptance IDs:
Tests:
Security checks:
Data migration impact:
Artifacts:
Next task selected:
Open release blockers:
```

`Open release blockers` 只能列 STOP-01–04，不能列一般問題。


---

# 文件：工程交接指令

# Engineer Handoff Prompt

將整個規格套件放入 Repository 根目錄後，把以下指令交給工程師或 AI Coding Agent：

> 你正在開發 Privacy Bridge v1.0。請先讀 `docs/MASTER-SPEC.md`、`docs/ENGINEER-EXECUTION-PROTOCOL.md`、`docs/IMPLEMENTATION-PLAN.md`、`docs/ACCEPTANCE-MATRIX.md` 與 `schemas/`。  
>   
> 依 E00 → E16 的相依順序持續實作，不得把 `reference/legacy-seed` 當作規格來源。每個 Task 先新增 failing test，再實作，並在 PR 中標記 Requirement ID、Acceptance ID 與 Test。  
>   
> 不要向 Product Owner 詢問一般產品、UI 或技術細節。規格沒有直接描述時，依「不外洩、不毀損、不錯誤還原、可稽核、相容」的順序採用最安全預設，並寫 ADR。新功能放入 v1.1 backlog，不擴張 v1。  
>   
> 只有 STOP-01 至 STOP-04 能阻擋 Release；即使發生，也要繼續所有不受影響的工作。  
>   
> 現在從 E00 Repository and CI 開始。每完成一項，自動選擇下一個 dependency-ready task，不等待額外指示，直到 Gate D 全部通過並產生 GitHub Alpha release artifacts。

## Handoff 驗證

工程師收到後第一個回覆只能包含：

```text
Spec validation result
Schema count
Acceptance count
Legacy seed status
Selected first task
Open STOP blockers
```

不得先提出產品問題。


---

# 文件：驗收矩陣

# Acceptance Matrix

**版本：** 1.0.0 LOCKED  
**項目數：** 105  
**Release blocker：** 105  

每一列都必須連結到實際 test。不得用人工聲明取代標記為 Release Blocker 的自動化或明確手動驗收。

| Acceptance ID | Category | Requirement IDs | Scenario / Input | Expected Result | Automated Test | Blocker | Gate |
|---|---|---|---|---|---|---|---|
| ACC-FND-001 | Foundation | PB-ENG-001 | Fresh clone; run install, lint, typecheck, test, build | All commands succeed with locked dependencies; production bundle produced | ci/bootstrap.test.mjs | YES | A |
| ACC-FND-002 | Foundation | PB-GOV-001,PB-TEST-003 | Validate all schema files and examples | Exactly 18 Draft 2020-12 schemas validate; all examples conform | schema/all-schemas.test.ts | YES | A |
| ACC-FND-003 | Foundation | PB-PRD-003,PB-SHADOW-001 | Run end-to-end job against fixture vault and hash source before/after | Every source byte and metadata hash remains unchanged | integration/source-readonly.test.ts | YES | B |
| ACC-FND-004 | Foundation | PB-ENG-003 | Import core package in a Node test without Obsidian mocks | Core has no Obsidian/Electron import or global app dependency | architecture/core-boundary.test.ts | YES | A |
| ACC-FND-005 | Foundation | PB-AUDIT-003,PB-ERR-001 | Run production workflow with canary PII/secret and capture stdout/stderr | No canary value appears in console, error, audit-safe export or crash summary | security/no-sensitive-logs.test.ts | YES | B |
| ACC-FND-006 | Foundation | PB-ENG-004 | Load manifest and production plugin on desktop runtime | Manifest is desktop-only; plugin refuses unsupported mobile/runtime with PB-PLATFORM-001 | integration/desktop-only.test.ts | YES | D |
| ACC-FND-007 | Foundation | PB-NET-001,PB-NET-002 | Execute all integration paths under denied network and scan bundle | Zero socket attempts; bundle/source dependency scan passes | security/network-deny.test.ts | YES | B |
| ACC-FND-008 | Foundation | PB-GOV-002,PB-TEST-002 | Run legacy regression seed through compatibility harness | All non-superseded assertions pass; superseded cases cite new Requirement IDs | regression/legacy-seed.test.ts | YES | A |
| ACC-STR-001 | Secure Store | PB-STORE-001 | Initialize on macOS/Windows defaults | Store is created under OS Application Data, never under Vault | store/default-path.test.ts | YES | B |
| ACC-STR-002 | Secure Store | PB-STORE-001 | Choose Vault, Shadow, Result, sync or network-mounted path | Selection is rejected with PB-STORE-001; no files written | store/unsafe-paths.test.ts | YES | B |
| ACC-STR-003 | Secure Store | PB-STORE-002 | Create client/job and search source Vault and Safe Package | No mapping, key envelope, review, occurrence or client metadata exists there | security/no-secure-data-in-vault.test.ts | YES | B |
| ACC-STR-004 | Secure Store | PB-DICT-001 | Create/import client dictionary | Dictionary exists only as authenticated encrypted file outside Vault | store/dictionary-encryption.test.ts | YES | B |
| ACC-STR-005 | Secure Store | PB-CRYPTO-001,PB-CRYPTO-003 | Create two clients and two jobs per client | CRKs differ; JRKs differ; wrapped keys decrypt only under correct client | crypto/key-isolation.test.ts | YES | B |
| ACC-STR-006 | Secure Store | PB-CRYPTO-002 | Run fixed passphrase/salt test vector | scrypt output matches examples/crypto-test-vectors.json on macOS/Windows | crypto/scrypt-vector.test.ts | YES | B |
| ACC-STR-007 | Secure Store | PB-CRYPTO-004 | Encrypt same plaintext 10,000 times | Every IV unique; all decrypt; tampered AAD/tag/ciphertext rejects | crypto/aes-gcm-properties.test.ts | YES | B |
| ACC-STR-008 | Secure Store | PB-CRYPTO-002,PB-ENG-005 | Unlock/lock client; inspect data.json, store and logs | Passphrase and derived keys are never persisted or logged | security/no-passphrase-persistence.test.ts | YES | B |
| ACC-STR-009 | Secure Store | PB-STORE-005 | Simulate 15-min idle, OS sleep, client switch and app close | Keys are cleared; sensitive views mask; operation requires unlock | integration/auto-lock.test.ts | YES | B |
| ACC-STR-010 | Secure Store | PB-CRYPTO-006,PB-TXN-001 | Wrong passphrase, corrupt key, and crash during passphrase change | Old client.key remains usable; no empty/new key overwrites it | recovery/passphrase-change.test.ts | YES | B |
| ACC-STR-011 | Secure Store | PB-STORE-004,PB-AUDIT-002 | Initialize operator and inspect persisted data | Only encrypted alias and opaque deviceId/fingerprint exist; no OS identity read | store/operator-identity.test.ts | YES | B |
| ACC-STR-012 | Secure Store | PB-JOB-005,PB-TXN-002 | Start two mutation operations on same job | Second operation is denied; stale lock requires journal-based recovery | recovery/job-lock.test.ts | YES | B |
| ACC-FIL-001 | File Inventory | PB-FILE-001 | Inventory active note, folder, whole vault and external folder | Each mode yields deterministic included/excluded document inventory | files/source-modes.test.ts | YES | C |
| ACC-FIL-002 | File Inventory | PB-FILE-002 | Scope contains .obsidian, .trash, .git and output/store dirs | Fixed system paths are excluded and audited without exposing absolute paths | files/system-exclusions.test.ts | YES | C |
| ACC-FIL-003 | File Inventory | PB-FILE-003 | Hidden user folder contains supported .md | Markdown is included unless path is a fixed system exclusion | files/hidden-markdown.test.ts | YES | C |
| ACC-FIL-004 | File Inventory | PB-SCOPE-003,PB-FILE-006 | Scope contains PDF/image/office/binary files | All appear as UNSUPPORTED_PENDING_EXCLUSION; scan cannot start until confirmed | files/unsupported-blocker.test.ts | YES | C |
| ACC-FIL-005 | File Inventory | PB-FILE-004 | Scope contains symlink/junction escaping root | Target is never followed; item blocks until excluded | files/symlink-junction.test.ts | YES | B |
| ACC-FIL-006 | File Inventory | PB-FILE-005 | Folder contains nested .obsidian | Nested vault boundary is detected and not traversed | files/nested-vault.test.ts | YES | C |
| ACC-FIL-007 | File Inventory | PB-FILE-007 | UTF-8, UTF-8 BOM, LF and CRLF fixtures | Supported files inventory correct encoding/BOM/line ending metadata | files/encoding-supported.test.ts | YES | C |
| ACC-FIL-008 | File Inventory | PB-FILE-007 | Big5/UTF-16/invalid UTF-8 fixture | File blocks with PB-FILE-002; no automatic conversion | files/encoding-reject.test.ts | YES | C |
| ACC-FIL-009 | File Inventory | PB-FILE-008 | Paths with .., absolute names, device names and separators | All normalized paths remain within approved root or reject | security/path-boundary.test.ts | YES | B |
| ACC-FIL-010 | File Inventory | PB-FILE-008 | Source has paths differing only by case/normalization | Collision is detected before Shadow build and blocks | files/path-collision.test.ts | YES | C |
| ACC-FIL-011 | File Inventory | PB-JOB-004 | Modify one source after review before build | Changed file decisions become stale; job returns SCANNING; no Shadow published | integration/source-change.test.ts | YES | C |
| ACC-FIL-012 | File Inventory | PB-JOB-004 | Delete or permission-deny source during scan | Job records safe error and cannot export; no partial plaintext remains | files/source-disappears.test.ts | YES | C |
| ACC-DET-001 | Detection | PB-DET-001 | Run detectAll on mixed Taiwan fixture | All validator-approved candidates returned with evidence; input unchanged | detection/detect-all.test.ts | YES | A |
| ACC-DET-002 | Detection | PB-DET-002,PB-EXPORT-001 | Candidates at ruleScore 0.35/0.55 with UI threshold 0.7 | UI may collapse them; Core, residual and export guard still see them | detection/threshold-separation.test.ts | YES | B |
| ACC-DET-003 | Detection | PB-DET-002 | Inspect public API and UI labels | Only ruleScore/規則分數 used; no confidence/accuracy percentage claim | detection/rule-score-naming.test.ts | YES | A |
| ACC-DET-004 | Detection | PB-MD-001 | Fixtures with emoji, surrogate pairs and combining marks | All candidate spans slice exact intended text using UTF-16 offsets | detection/unicode-offset.test.ts | YES | A |
| ACC-DET-005 | Detection | PB-MD-007 | LINE ID: LINE; password: password; secret: secret | Only right-side values are captured and replaced | detection/capture-indices.test.ts | YES | A |
| ACC-DET-006 | Detection | PB-DET-005 | 護照：無 newline 訂單號：123456789 | Order number receives no passport context from prior line | detection/context-no-cross-line.test.ts | YES | A |
| ACC-DET-007 | Detection | PB-DET-005 | YAML, table column, label-value and same-line context fixtures | Evidence source and score adjustment match structural context rules | detection/structured-context.test.ts | YES | A |
| ACC-DET-008 | Detection | PB-CAND-002 | Overlapping credit card/bank account and ID/secret matches | Longer/stronger primary retained; all risk flags and matched rules preserved | detection/overlap-risk-union.test.ts | YES | A |
| ACC-DET-009 | Detection | PB-CAND-003 | AB12345677 without decisive context | ARC and invoice alternatives retained; AMBIGUOUS_TYPE; export blocked | detection/ambiguous-identifier.test.ts | YES | A |
| ACC-DET-010 | Detection | PB-CAND-002 | 密碼：A123456789 | Primary type remains TW_ID; that occurrence handling is BLOCK_EXPORT and both rules are recorded; unrelated occurrences are not automatically blocked | detection/block-handling-merge.test.ts | YES | A |
| ACC-DET-011 | Detection | PB-DET-006 | 090–098, 099, 0800, 0809, normal landline, +886 fixtures | Numbers classified as MOBILE, PHONE_SERVICE or LANDLINE exactly as spec | detection/tw-phone-types.test.ts | YES | A |
| ACC-DET-012 | Detection | PB-DET-006 | 0900/0910/0911-like values | Landline validator never accepts them as landline | detection/no-mobile-as-landline.test.ts | YES | A |
| ACC-DET-013 | Detection | PB-DET-007 | 3/D/F/G passport and contextual 1/2/A formats | Known formats TW_PASSPORT; broad contextual values PASSPORT_CANDIDATE | detection/passport-tiering.test.ts | YES | A |
| ACC-DET-014 | Detection | PB-DET-007 | Nine-digit order number without passport context | No passport candidate produced | detection/passport-no-context-drop.test.ts | YES | A |
| ACC-DET-015 | Detection | PB-DET-008 | Addresses with 2之2號, 2號之2, rural doorplate, floors | Entire address span captured without trailing fragment leak | detection/tw-address.test.ts | YES | A |
| ACC-DET-016 | Detection | PB-DET-009 | 106409 臺北市..., 110臺北市..., labeled 3/5/6 digits | Postal code candidate and context evidence correct | detection/tw-postcode.test.ts | YES | A |
| ACC-DET-017 | Detection | PB-DET-010 | Private key/JWT/API key/password/connection string fixtures | Handling is BLOCK_EXPORT; no reversible entity/token may be created | detection/secret-block.test.ts | YES | B |
| ACC-DET-018 | Detection | PB-DET-003 | Valid/invalid Taiwan ID, ARC, tax ID, NHI, invoice, plate fixtures | Checksums and formats match locked rule behavior, including negative cases | detection/taiwan-regression.test.ts | YES | A |
| ACC-DET-019 | Detection | PB-DET-003 | Email, IPv4, URL, LINE value-only fixtures | Exact value span and type returned; labels excluded | detection/common-identifiers.test.ts | YES | A |
| ACC-DET-020 | Detection | PB-DET-001,PB-TEST-001 | Fuzz random Unicode and adversarial long lines | Detector terminates within limits, never throws, spans remain valid/non-negative | fuzz/detector-fuzz.test.ts | YES | A |
| ACC-REV-001 | Review | PB-CAND-004 | Same canonical entity occurs in 20 documents | One entity-level decision applies to all occurrences; occurrences expandable | review/entity-level.test.ts | YES | C |
| ACC-REV-002 | Review | PB-CAND-004 | Split one occurrence from accepted entity | Both resulting entities return PENDING and require explicit decisions | review/split-invalidates.test.ts | YES | C |
| ACC-REV-003 | Review | PB-CAND-004 | Merge two entities whose occurrences have different effective handling | Entity default is resolved safely; every occurrence keeps stricter effective handling; Block cannot be downgraded | review/merge-severity.test.ts | YES | C |
| ACC-REV-004 | Review | PB-UX-002 | Low-score candidates with default UI threshold | Count remains visible; show-all exposes every pending candidate | ui/low-score-visibility.test.ts | YES | C |
| ACC-REV-005 | Review | PB-UX-003 | Batch accept/ignore 100 filtered candidates | Shows count and examples, requires confirmation, writes audit, supports pre-build undo | review/batch-action.test.ts | YES | C |
| ACC-REV-006 | Dictionary | PB-DICT-002 | 星河, 星河科技, 星河科技股份有限公司 overlap | Longest exact NFC match wins; no fuzzy or cross-script inference | dictionary/longest-exact.test.ts | YES | C |
| ACC-REV-007 | Dictionary | PB-DICT-002 | English case-sensitive/insensitive and explicit aliases | Behavior follows entry setting; unlisted fuzzy spelling does not match | dictionary/case-alias.test.ts | YES | C |
| ACC-REV-008 | Dictionary | PB-DICT-003 | Dictionary match overlaps secret/checksum rules | Dictionary may set primary type; BLOCK risk and matched rules remain | dictionary/priority-risk.test.ts | YES | C |
| ACC-REV-009 | Dictionary | PB-DICT-004 | Client dictionary plus job override conflict | Job override wins only in that job; other jobs use client entry | dictionary/scope-override.test.ts | YES | C |
| ACC-REV-010 | Review | PB-UX-002,PB-CAND-003 | Ambiguous candidate remains undecided | Job cannot reach READY_TO_BUILD; UI explains ambiguity | review/ambiguous-gate.test.ts | YES | C |
| ACC-REV-011 | Dictionary | PB-SEC-004 | Import >25MB, >50k entries, too-long term or >20 aliases | Entire dictionary import rejects before persistence; existing dictionary unchanged | dictionary/import-limits.test.ts | YES | B |
| ACC-REV-012 | Review | PB-JOB-004 | Dictionary/rules version changes after review | Run and affected decisions become stale; rescan required | review/version-stale.test.ts | YES | C |
| ACC-TOK-001 | Token | PB-TOKEN-001 | Generate 100k entity tokens | Every token matches exact grammar; IDs unique; no source/job/client text embedded | token/format-uniqueness.test.ts | YES | B |
| ACC-TOK-002 | Token | PB-TOKEN-002 | Same canonical value repeated with aliases in one job | Same Entity token used according to explicit alias/canonicalization rules | token/same-job-consistency.test.ts | YES | C |
| ACC-TOK-003 | Token | PB-TOKEN-003 | Same source values in two jobs | Tokens and canonical fingerprints differ across jobs | token/cross-job-unlinkability.test.ts | YES | B |
| ACC-TOK-004 | Token | PB-TOKEN-005 | Phone appears in multiple surface formats | One entity token; encrypted occurrences preserve surface and effective handling; result restore uses preferred display | token/surface-preferred-display.test.ts | YES | C |
| ACC-TOK-005 | Token | PB-TOKEN-006 | Multiple adjacent and nested accepted spans | Replacement from end yields exact sanitized output with valid offsets | token/reverse-replacement.test.ts | YES | C |
| ACC-TOK-006 | Token | PB-TOKEN-006 | Source span text/hash altered before tokenization | Operation fails PB-FILE-004; no output or mapping mutation | token/span-hash-guard.test.ts | YES | B |
| ACC-TOK-007 | Token | PB-IMPORT-003 | Flip one token ID/tag/type character | Verifier rejects token without revealing whether ID exists | token/forgery.test.ts | YES | B |
| ACC-TOK-008 | Token | PB-IMPORT-003 | Use valid token from another job | Verifier rejects whole result package | token/cross-job-reject.test.ts | YES | B |
| ACC-TOK-009 | Crypto | PB-CRYPTO-003 | Derive domain keys from fixed JRK/client/job | All keys match vector and differ from each other | crypto/hkdf-domain.test.ts | YES | B |
| ACC-TOK-010 | Crypto | PB-CRYPTO-004 | Generate many envelopes and inspect IVs | No IV reuse; each envelope authenticates exact AAD | crypto/iv-uniqueness.test.ts | YES | B |
| ACC-TOK-011 | Crypto | PB-CRYPTO-004 | Tamper ciphertext, tag, IV and each AAD component | Every mutation fails authentication and leaves target unchanged | crypto/envelope-tamper.test.ts | YES | B |
| ACC-TOK-012 | Crypto | PB-CRYPTO-002 | Passphrase length 11,12,256,257 code points and no normalization pairs | Only 12–256 accepted; visually equivalent Unicode remains byte-distinct | crypto/passphrase-policy.test.ts | YES | B |
| ACC-TOK-013 | Mapping | PB-TOKEN-002,PB-STORE-002 | Persist/reload mapping and occurrence data | Authenticated encrypted records reproduce tokens/decisions exactly | mapping/persistence-roundtrip.test.ts | YES | C |
| ACC-TOK-014 | Handling | PB-DET-010 | Accepted SECRET or credit card attempts TOKENIZE | API rejects action; only REDACT, EXCLUDE or BLOCK permitted | handling/no-reversible-secret.test.ts | YES | B |
| ACC-TOK-015 | Mapping | PB-BACKUP-002 | Delete/missing mapping or job key | System never creates replacement key/map under same job; restore blocked with precise safe error | mapping/no-silent-recreate.test.ts | YES | B |
| ACC-EXP-001 | Shadow | PB-MD-002 | Golden Markdown with spacing, comments, YAML, CRLF/BOM | Output differs only at approved spans/path references; byte properties preserved | golden/markdown-preservation.test.ts | YES | C |
| ACC-EXP-002 | Shadow | PB-MD-003,PB-MD-004 | Frontmatter/code candidates with accepted policies | Values change per decision; keys/variables not auto-renamed; secrets block/redact | golden/frontmatter-code.test.ts | YES | C |
| ACC-EXP-003 | Shadow | PB-SHADOW-003 | Crash/cancel at each build phase | No partial final Shadow appears; staging cleaned or recoverable | recovery/shadow-atomic.test.ts | YES | C |
| ACC-EXP-004 | Shadow | PB-MD-005,PB-MD-006 | Rename sensitive paths with wikilinks/headings/block refs | All links resolve inside Shadow; original paths absent from export | golden/wikilink-pathmap.test.ts | YES | C |
| ACC-EXP-005 | Shadow | PB-SHADOW-002 | Scan built Shadow for secure filenames/canary raw values | No mapping/dictionary/key/audit/original canary or .obsidian metadata exists | security/shadow-content-allowlist.test.ts | YES | B |
| ACC-EXP-006 | Residual | PB-EXPORT-001 | Sanitized file contains a 0.35 residual candidate | scanResidualAll returns it regardless of UI threshold | export/residual-all.test.ts | YES | B |
| ACC-EXP-007 | Residual | PB-EXPORT-002 | Residual pending or accepted without reason | Export disabled; only reviewed reasoned residual can proceed | export/residual-review-gate.test.ts | YES | B |
| ACC-EXP-008 | Export Guard | PB-EXPORT-003 | Each precondition independently fails | Export disabled and lists every failure reason with error code | export/guard-matrix.test.ts | YES | C |
| ACC-EXP-009 | Safe Package | PB-EXPORT-004,PB-EXPORT-005 | Build package with malicious/odd paths | All ZIP entries normalized relative; zip-slip/symlink entries impossible | security/safe-zip.test.ts | YES | B |
| ACC-EXP-010 | Safe Package | PB-EXPORT-004 | Inspect package manifest/index/notes | No Mapping, dictionary, original path/value, key or audit content | security/package-content.test.ts | YES | B |
| ACC-EXP-011 | Safe Package | PB-EXPORT-005 | Corrupt one file after package build | Self-validation or checksum validation fails; job not marked EXPORTED | export/package-self-validate.test.ts | YES | C |
| ACC-EXP-012 | Safe Package | PB-EXPORT-005 | Package exceeds 2GB estimate/actual | Build stops safely with explicit error; no partial final package | export/package-size-limit.test.ts | YES | C |
| ACC-IMP-001 | Import | PB-IMPORT-001,PB-IMPORT-002 | Valid UTF-8 JSON matching exact supported schema | Package validates and enters RESULT_IMPORTED | import/valid-result.test.ts | YES | C |
| ACC-IMP-002 | Import | PB-IMPORT-003 | Malformed token-like delimiters or unsupported schema fields | Whole package rejects; no partial findings persisted | import/malformed-token-strict.test.ts | YES | B |
| ACC-IMP-003 | Import | PB-IMPORT-003 | Unknown or forged token in one finding | Whole package rejects with generic PB-IMPORT-003 | import/unknown-forged-token.test.ts | YES | B |
| ACC-IMP-004 | Import | PB-IMPORT-003 | Valid token from another job or source package hash mismatch | Whole package rejects | import/cross-job-package.test.ts | YES | B |
| ACC-IMP-005 | Import | PB-IMPORT-003 | Unknown document ID, path traversal strings, duplicate finding IDs | Whole package rejects before restore | import/references-paths.test.ts | YES | B |
| ACC-IMP-006 | Import | PB-IMPORT-004 | Summary includes script, HTML event, obsidian URI and markdown link | UI renders inert plain text; generated Markdown escapes unsafe constructs | security/result-rendering.test.ts | YES | B |
| ACC-IMP-007 | Restore | PB-RESTORE-001,PB-RESTORE-002 | Restore valid findings with repeated tokens | Preferred display restored; new sequence Result Vault created; original/Shadow unchanged | restore/end-to-end.test.ts | YES | C |
| ACC-IMP-008 | Import | PB-IMPORT-003 | Oversized/deep/huge-count JSON | Rejected within resource limits before dangerous allocation; store unchanged | fuzz/result-dos.test.ts | YES | B |
| ACC-OPS-001 | Audit | PB-AUDIT-001,PB-AUDIT-003 | Run complete workflow with canary raw values | Encrypted audit contains allowed metadata only; no raw canary after decrypting audit structure | audit/no-raw-values.test.ts | YES | B |
| ACC-OPS-002 | Audit | PB-AUDIT-002 | Delete/reorder/modify an audit event | Chain verification fails and job enters BLOCKED | audit/hash-chain.test.ts | YES | B |
| ACC-OPS-003 | Recovery | PB-TXN-002,PB-TXN-003 | Crash at every journal phase and stale lock conditions | Default rollback restores last committed state; verified roll-forward only where allowed | recovery/journal-phase-matrix.test.ts | YES | C |
| ACC-OPS-004 | Migration | PB-MIG-001,PB-MIG-002 | Fail migration before/after swap and try downgrade | Old data remains readable; recovery snapshot works; unsupported downgrade never overwrites | migration/copy-on-write.test.ts | YES | B |
| ACC-OPS-005 | Backup/Delete | PB-BACKUP-001,PB-DELETE-001 | Create/import backup, wrong password, corrupt ZIP, delete job secrets | Valid backup roundtrips; invalid writes nothing; deletion never touches source; no silent key recreation | backup/job-backup.test.ts | YES | C |
| ACC-OPS-006 | Release | PB-NET-002,PB-TEST-004 | Build release from tagged commit on clean runner | Bundle, manifest, styles, source commit, checksum and SBOM correspond; all 105 acceptance pass | release/reproducible-artifacts.test.mjs | YES | D |


---

# 文件：Release Checklist

# Release Checklist

**版本：** 1.0.0 LOCKED  
**規則：** 所有標記 `[BLOCKER]` 的項目都必須通過。不得用「已知問題」繞過安全與資料完整性 Gate。

---

# Gate A — Core Ready

- [ ] [BLOCKER] `packages/core` 不依賴 Obsidian API
- [ ] [BLOCKER] TypeScript strict 無錯誤
- [ ] [BLOCKER] 18 份 JSON Schema Draft 2020-12 驗證通過
- [ ] [BLOCKER] 所有 examples 通過 Schema
- [ ] [BLOCKER] `detectAll()` 不接受 UI threshold
- [ ] [BLOCKER] `ruleScore` 完成，無 `confidence` 公開 API
- [ ] [BLOCKER] UTF-16 offset Golden Fixtures 通過
- [ ] [BLOCKER] Capture indices 案例通過
- [ ] [BLOCKER] Context 不跨行污染
- [ ] [BLOCKER] 多重候選與 risk merge 通過
- [ ] [BLOCKER] 099／0800／0809 分類正確
- [ ] [BLOCKER] `+886` 市話通過
- [ ] [BLOCKER] 護照兩層候選通過
- [ ] [BLOCKER] 地址「之號／號之」通過
- [ ] [BLOCKER] Legacy regression seed 全部通過或有 Spec supersession 註記
- [ ] [BLOCKER] Property-based span／overlap tests 通過
- [ ] Core coverage 報告產生
- [ ] Benchmark baseline 記錄

---

# Gate B — Security Ready

- [ ] [BLOCKER] 原始 Vault adapter 沒有 write method
- [ ] [BLOCKER] Secure Store 不在 Vault
- [ ] [BLOCKER] Sync／network path 被拒絕
- [ ] [BLOCKER] Client CRK 與 Job JRK 階層完成
- [ ] [BLOCKER] scrypt 固定參數通過 crypto vector
- [ ] [BLOCKER] AES-256-GCM tamper test 通過
- [ ] [BLOCKER] IV uniqueness property test 通過
- [ ] [BLOCKER] Wrong Passphrase 不覆寫任何檔案
- [ ] [BLOCKER] Job Token HMAC forgery test 通過
- [ ] [BLOCKER] Cross-job token 拒絕
- [ ] [BLOCKER] Passphrase／Key 不寫入磁碟或 Log
- [ ] [BLOCKER] Auto-lock 15 分鐘、sleep、Client switch、app close 通過
- [ ] [BLOCKER] Mapping／Dictionary／Audit 加密
- [ ] [BLOCKER] Audit 不含原文
- [ ] [BLOCKER] Audit chain tamper 會 Block
- [ ] [BLOCKER] Secret 不能可逆 Tokenize
- [ ] [BLOCKER] Production source 無網路路徑
- [ ] [BLOCKER] Production bundle 無網路路徑
- [ ] [BLOCKER] Runtime network-deny 測試零連線
- [ ] [BLOCKER] 無 Telemetry
- [ ] [BLOCKER] 無 runtime dependency download
- [ ] [BLOCKER] SBOM 產生
- [ ] [BLOCKER] Secret scan 通過
- [ ] [BLOCKER] License scan 通過
- [ ] [BLOCKER] Dependency lock 驗證
- [ ] [BLOCKER] Threat Model 由非作者 reviewer 走讀
- [ ] [BLOCKER] Production Console 不輸出敏感資料

---

# Gate C — Workflow Ready

## Client／Job

- [ ] [BLOCKER] 建立／解鎖／鎖定 Client
- [ ] [BLOCKER] 建立 Job
- [ ] [BLOCKER] Job 狀態機拒絕非法轉換
- [ ] [BLOCKER] Client／Job isolation

## Inventory／Scan

- [ ] [BLOCKER] Active Note
- [ ] [BLOCKER] Folder
- [ ] [BLOCKER] Whole Vault
- [ ] [BLOCKER] External Folder
- [ ] [BLOCKER] Unsupported inventory
- [ ] [BLOCKER] Symlink／junction blocker
- [ ] [BLOCKER] Nested Vault blocker
- [ ] [BLOCKER] UTF-8 validation
- [ ] [BLOCKER] Source snapshot／rehash

## Review

- [ ] [BLOCKER] Entity-level review
- [ ] [BLOCKER] Occurrence expand
- [ ] [BLOCKER] Merge／Split
- [ ] [BLOCKER] Batch confirm＋Audit
- [ ] [BLOCKER] Low-score count visible
- [ ] [BLOCKER] No auto accept
- [ ] [BLOCKER] Dictionary exact longest match
- [ ] [BLOCKER] Job override

## Build／Export

- [ ] [BLOCKER] Reverse-order tokenization
- [ ] [BLOCKER] Shadow staging／atomic publish
- [ ] [BLOCKER] Markdown byte-preservation Golden Fixtures
- [ ] [BLOCKER] Wikilink integrity
- [ ] [BLOCKER] `scanResidualAll`
- [ ] [BLOCKER] Export Guard checks all candidates
- [ ] [BLOCKER] Safe Package allowlist
- [ ] [BLOCKER] ZIP slip tests
- [ ] [BLOCKER] Package self-validation
- [ ] [BLOCKER] Mapping／raw path absent

## Import／Restore

- [ ] [BLOCKER] Result strict Schema
- [ ] [BLOCKER] Job／package hash validation
- [ ] [BLOCKER] Unknown／cross-job token reject
- [ ] [BLOCKER] Malformed token-like sequence reject
- [ ] [BLOCKER] HTML／URI inert rendering
- [ ] [BLOCKER] Result Vault sequence output
- [ ] [BLOCKER] Original／Shadow never overwritten

## Backup／Recovery

- [ ] [BLOCKER] `.pbjob` create／self-validate
- [ ] [BLOCKER] Wrong backup passphrase no writes
- [ ] [BLOCKER] Backup ZIP slip reject
- [ ] [BLOCKER] Stale lock recovery
- [ ] [BLOCKER] Crash test at every journal phase
- [ ] [BLOCKER] Passphrase change rollback
- [ ] [BLOCKER] Migration copy-on-write
- [ ] [BLOCKER] Delete job secrets no source impact

---

# Gate D — GitHub Alpha Ready

- [ ] [BLOCKER] 105 Acceptance Matrix release blockers通過
- [ ] [BLOCKER] macOS clean-profile end-to-end
- [ ] [BLOCKER] Windows clean-profile end-to-end
- [ ] Linux best-effort smoke test
- [ ] [BLOCKER] Keyboard-only end-to-end
- [ ] [BLOCKER] Screen reader labels review
- [ ] [BLOCKER] UI disabled reasons完整
- [ ] [BLOCKER] Client lock clears sensitive UI
- [ ] [BLOCKER] 50 MB／1,000 notes benchmark
- [ ] [BLOCKER] Fuzz suites完成
- [ ] [BLOCKER] README 安全限制
- [ ] [BLOCKER] README 明確寫可逆假名化、非匿名化
- [ ] [BLOCKER] README 明確寫自動偵測不能保證完整
- [ ] [BLOCKER] README 明確寫其他外掛權限風險
- [ ] [BLOCKER] README 明確寫 Alpha 不建議正式客戶資料
- [ ] [BLOCKER] Install／Uninstall／Upgrade／Rollback instructions
- [ ] [BLOCKER] SECURITY.md
- [ ] [BLOCKER] Threat Model
- [ ] [BLOCKER] Demo Vault 只含合成資料
- [ ] [BLOCKER] Demo Result
- [ ] [BLOCKER] CHANGELOG
- [ ] [BLOCKER] Source commit recorded
- [ ] [BLOCKER] SHA-256 checksum
- [ ] [BLOCKER] SBOM attached
- [ ] [BLOCKER] Release archive自我驗證
- [ ] [BLOCKER] No secret／PII in Git history
- [ ] [BLOCKER] License headers and MIT file
- [ ] Official directory submission skipped for Alpha
- [ ] v1.1 backlog created without expanding v1

---

# Release Sign-off

| Role | Gate | Required |
|---|---|---|
| Tech Lead | A、C | Yes |
| Security Reviewer | B | Yes |
| QA Owner | A、C、D | Yes |
| Product Owner | Scope verification only | No additional product decisions |
