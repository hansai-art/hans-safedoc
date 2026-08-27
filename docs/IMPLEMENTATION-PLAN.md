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
