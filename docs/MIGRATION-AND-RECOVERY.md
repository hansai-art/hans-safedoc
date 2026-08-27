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
