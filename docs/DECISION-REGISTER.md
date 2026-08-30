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
| DEC-013 | 雲端 | 文件處理與遙測完全不連網；正式版不含模型下載、匯入或推論能力 | 文件內容永遠不送出；人名與組織必須人工檢查 |
| DEC-014 | Telemetry | 無 | 不收集使用資料 |
| DEC-015 | 模型 | v1.1正式版不分發或載入NER模型 | 第三方候選來源鏈不完整，自建候選未達品質門檻；固定規則完整可用，人名與組織人工檢查 |
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
