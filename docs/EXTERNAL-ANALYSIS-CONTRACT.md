# External Analysis Contract

**版本：** 1.0.0 LOCKED  
**對象：** 接收 Safe Package 的分析程式、AI Agent 或外部服務  
**注意：** Privacy Bridge 不負責上傳；此文件定義外部處理後必須回傳的格式。

---

# 1. Input Rules

外部分析端只應讀取 Safe Package 中：

- `manifest.json`
- `schema.json`
- `notes/*.md`
- `entity-index.json`
- `checksums.json`

不得要求：

- Mapping
- 客戶字典
- 原始文件
- 原始檔名
- Passphrase
- Key
- Privacy Bridge Secure Store

---

# 2. Token Rules

Token 是 opaque reference：

```text
⟦PB:<TYPE>:<ID>:<TAG>⟧
```

外部分析端必須：

- 原樣保留完整 Token
- 不拆分、改寫、翻譯或縮短
- 不自行產生新 Token
- 不把兩個 Token 合併成一個
- 需要提及實體時，在 `entityRefs` 引用
- Summary 可包含 Token，但只能使用輸入中已存在的 Token

外部端不能知道 Token 對應原文。

---

# 3. Output

只回傳單一 UTF-8 JSON，符合 `schemas/result-package.schema.json`。

```json
{
  "schemaVersion": "1.0.0",
  "jobId": "PB-20260825-0123456789",
  "sourcePackageHash": "...",
  "createdAt": "2026-08-25T08:10:00Z",
  "producer": "Analyzer name",
  "findings": [
    {
      "findingId": "uuid-v4",
      "entityRefs": ["⟦PB:PERSON:...:...⟧"],
      "category": "relationship",
      "summary": "該實體與另一實體具有合作關係。",
      "sourceDocumentIds": ["uuid-v4"]
    }
  ]
}
```

---

# 4. Result Restrictions

- 不加入未定義欄位
- 不回傳 Markdown file
- 不回傳 HTML
- 不回傳 ZIP
- 不回傳路徑
- 不回傳程式碼
- 不回傳 Obsidian URI
- 不回傳 binary／base64 attachment
- 不使用控制字元
- 不引用 Safe Package 中不存在的 documentId
- 不引用不存在的 Token
- findingId 必須唯一 UUIDv4
- `category` 只用 ASCII letters、digits、dot、underscore、hyphen

---

# 5. Recommended Analyzer Instruction

```text
Analyze only the provided sanitized Markdown files.

Treat every token matching ⟦PB:TYPE:ID:TAG⟧ as an opaque entity reference.
Never alter, abbreviate, translate, split, merge, or invent tokens.

Return only JSON conforming exactly to the provided result-package schema.
Use only document IDs and tokens found in the package.
Do not include paths, HTML, Markdown files, executable content, or extra fields.
The sourcePackageHash and jobId must be copied exactly from manifest.json.
```

---

# 6. Failure Handling

若外部端無法完成：

- 回傳零 findings 的合法 Result Package，或
- 不產生檔案

不得回傳部分 JSON、錯誤 HTML 頁面或文字說明冒充 Result Package。
