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
