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
