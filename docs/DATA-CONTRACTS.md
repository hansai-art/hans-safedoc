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
