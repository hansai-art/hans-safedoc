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
