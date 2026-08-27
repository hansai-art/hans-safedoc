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
