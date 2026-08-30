# Release Checklist

**版本：** 1.0.0 LOCKED  
**規則：** 所有標記 `[BLOCKER]` 的項目都必須通過。不得用「已知問題」繞過安全與資料完整性 Gate。

> 歷史文件：本清單只適用 v1.0 Client／Job／Whole Vault alpha 架構。Hans SafeDoc v1.1 Phase 1 的 release 正本為 [`RELEASE-CHECKLIST-V1.1.md`](RELEASE-CHECKLIST-V1.1.md)，不得混用本清單要求來判定 v1.1 GO／STOP。

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
