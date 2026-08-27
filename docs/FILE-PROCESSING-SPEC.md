# File and Markdown Processing Specification

**版本：** 1.0.0 LOCKED

---

# 1. Inventory Algorithm

```text
resolve approved root
→ lstat root
→ recursively lstat entries without following links
→ fixed system exclusion
→ nested vault detection
→ extension classification
→ encoding probe
→ case/Unicode path collision
→ size and hash
→ inventory review
```

排序固定使用 normalized relative path 的 Unicode code point order，確保重跑一致。

---

# 2. System Exclusion

Case-insensitive match on Windows/macOS default file systems；case-sensitive Linux仍以明確名稱排除：

```text
.obsidian
.trash
.git
privacy-bridge staging
Secure Store realpath
Shadow realpath
Result realpath
```

不以單純字串 prefix 判斷；使用 path segment 與 realpath。

---

# 3. Markdown Regions

Parser 輸出 Span，不能重寫文件：

```ts
type Region =
  | 'FRONTMATTER_KEY'
  | 'FRONTMATTER_VALUE'
  | 'BODY_TEXT'
  | 'TABLE_CELL'
  | 'CODE_FENCE'
  | 'INLINE_CODE'
  | 'HTML_COMMENT'
  | 'WIKILINK_TARGET'
  | 'WIKILINK_DISPLAY'
  | 'TAG'
```

每個 Region：

- start/end UTF-16
- line/column for UI only
- structural parent ID
- context labels
- source hash

---

# 4. Context Scope

## label-value

支援：

```text
標籤：值
label: value
label = value
```

只在同行。Label 本身不包含於 value capture。

## YAML

以 property path 作 context，例如 `customer.email`。不跨 sibling property。

## Table

Header 對同 column cells 提供 context。Row label 可對同行 cell 提供 secondary context。

## Code

JSON property只在可安全解析的 JSON fenced code中使用；其他 code 只使用 same-line label evidence，不執行 code。

## Paragraph

段落以空行分隔。Paragraph evidence權重低於 same-line，不能把純數字提升為高證據護照。

---

# 5. Output Preservation

- 讀取 bytes，偵測 BOM／line ending。
- decode UTF-8。
- 建立 UTF-16 spans。
- replacement 從 end desc。
- encode UTF-8。
- restore BOM。
- 不 normalize Unicode。
- 不 normalize line ending。
- 不加 trailing newline。
- 不重新排序 frontmatter。
- 不改 Markdown quote style。

---

# 6. Filename Mapping

Path segments 可個別 Tokenize。若檔名含多個敏感項目，產生 opaque segment：

```text
DOC-<6-digit-sequence>.md
DIR-<6-digit-sequence>/
```

Sequence 只在 Shadow Path Map 中決定，不反映 Entity ID。避免從檔名推測人物數量或類型。

Path Map 加密保存；Safe Package 可看到 sanitized path。

---

# 7. Link Rewrite

解析：

```text
[[target]]
[[target|display]]
[[target#heading]]
[[target^block]]
![[target]]
```

- Embed 與 link 都更新 target。
- Heading／block suffix 保留。
- display independently tokenized。
- External markdown link URL 由 URL rule處理；不把 link label當 path。
- Unresolved link在 build validation列為 warning；若原始即 unresolved且無改動，可人工接受；若由 Path Map造成則 blocker。

---

# 8. Unsupported and Large Files

單一 Markdown 最大 100 MB。超過：

- 列為 blocker
- v1 不分塊處理
- 使用者拆分或排除

空檔合法，產生零 Candidate。

---

# 9. Source Read-only Enforcement

Vault Adapter interface只提供：

```ts
list()
readBytes()
stat()
realpath()
```

不提供 `write`、`modify`、`rename`、`delete`。Shadow Output 使用完全不同 adapter type，避免誤傳 source handle。
