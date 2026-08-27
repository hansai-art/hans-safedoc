# Test Plan

**版本：** 1.0.0 LOCKED

---

# 1. Test Corpus Policy

所有提交到 GitHub 的測試資料只能是：

- 完全合成
- 官方公開示例
- 明確不可對應真實人的格式測試值

不得提交：

- 真實客戶資料
- 真實員工名冊
- 真實 API Key
- 從客戶文件改幾個字的「匿名」資料
- 真實內部路徑與主機名

每個 fixture 需有 `PROVENANCE.md`。

---

# 2. Directory

```text
test-corpus/
├── regression/
├── golden/
├── malformed/
├── security/
└── performance/
```

## regression

臺灣規則與 legacy seed。

## golden

Input、review decisions、expected Shadow、expected Result。

## malformed

Invalid UTF-8、bad JSON、bad Schema、path collision metadata。

## security

Token forgery、ZIP slip、HTML／URI、symlink、audit tamper、cipher tamper。

## performance

由 generator 建立，不提交大型二進位檔。

---

# 3. Required Test Types

## Unit

Pure functions：validator、canonicalization、span、token、schema、state reducer。

## Regression

每個修正 bug 必須有永久案例，註明 Requirement ID。

## Golden

Byte-level Markdown output。

## Property-based

- random Unicode spans
- overlap invariants
- token grammar/uniqueness
- IV uniqueness
- canonicalization idempotence
- path normalization remains under root

## Fuzz

- Result JSON
- Dictionary import
- ZIP metadata
- Markdown parser
- Token-like strings

## Integration

完整 Job lifecycle with temporary Vault／Store。

## Recovery

每個 transaction phase注入 crash。

## Security

Network deny、log canary、source write trap、tamper。

## Performance

固定 generator seed與 hardware metadata。

---

# 4. Precision / Recall Evaluation

79 或 105 個測試通過不代表準確率。Beta 前建立標註的合成企業語料，按類型計算：

- Precision
- Recall
- F1
- candidates per 1,000 chars
- low-score candidates per 1,000 chars
- review time per document
- residual rate

v1 Alpha只宣稱規則覆蓋，不宣稱企業資料實際召回率。

---

# 5. Release Test Order

```text
schema
→ unit
→ regression
→ golden
→ property
→ integration
→ recovery
→ security
→ fuzz
→ performance
→ clean install
```

任何 blocker失敗，Release停止；其他修復工作可並行。
