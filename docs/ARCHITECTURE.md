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
