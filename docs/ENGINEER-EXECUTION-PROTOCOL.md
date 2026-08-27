# Engineer Execution Protocol

**狀態：** LOCKED  
**適用：** 人類工程師、Tech Lead、QA、AI Coding Agent  
**目的：** 讓實作不中斷，不把規格內可推導的問題丟回 Product Owner。

---

# 1. 啟動指令

將以下文字與本規格套件一起交給工程師或 AI Coding Agent：

> 依 `docs/MASTER-SPEC.md` 與 `docs/IMPLEMENTATION-PLAN.md`，按 E00 至 E16 的相依順序持續開發。不得因一般產品、UI 或技術細節等待回覆。遇到未明確描述的事項，依安全優先順序採用最保守、可逆、最少外洩的方案並記錄 ADR。只有 STOP-01 至 STOP-04 可以阻擋 Release；即使發生，仍須繼續所有不受影響的工作。每個 PR 必須對應 Requirement ID、Acceptance ID 與自動化測試。不得把 legacy seed 當成規格來源。

---

# 2. 每個工作單位的必讀順序

```text
MASTER-SPEC 對應 Requirement
→ Schema
→ Acceptance row
→ Golden fixture
→ Decision Register
→ Threat Model
→ Existing implementation
```

若 Existing implementation 不一致，修改 implementation，不修改規格。

---

# 3. 自行決策演算法

```text
是否影響敏感資料外洩？
  是 → 選擇更嚴格方案
否
是否可能修改／毀損原始資料？
  是 → 改為 copy-on-write／read-only
否
是否可能造成錯誤還原或跨 Job？
  是 → fail closed
否
是否改變 Schema／Token／Crypto？
  是 → 依已鎖定契約；不得自行替換
否
是否可在一天內逆轉且不影響 Acceptance？
  是 → 選最簡單方案並寫 ADR
否
是否為 v1 新功能？
  是 → 放 v1.1-backlog，不實作
否
依既有 codebase 慣例實作
```

---

# 4. 不得詢問的問題

不得因以下內容等待：

- 「這個按鈕放左邊還右邊？」
- 「變數叫什麼？」
- 「要用哪個等價的本機套件？」
- 「錯誤訊息要不要關閉？」
- 「低分候選要不要顯示？」
- 「要不要直接修改原文？」
- 「Mapping 能不能放 Vault？」
- 「Secret 要 Tokenize 還是 Block？」
- 「Result 可以不可以收 Markdown？」
- 「測試失敗要不要先跳過？」
- 「新功能要不要順便做？」

答案已由 UX、Decision Register 或安全優先順序固定。

---

# 5. 必須回報但不等待的情況

- 發現規則漏判案例
- 發現效能低於 target
- 發現第三方套件停止維護
- 發現 UI 可用性問題
- 發現 v1.1 機會
- 發現測試資料不足
- 發現可簡化內部實作但不改契約

回報格式：

```text
Observation:
Impact:
Decision taken:
Spec / Acceptance IDs:
Tests:
Backlog follow-up:
```

然後繼續。

---

# 6. STOP Blocker

只有：

- STOP-01 Original data destruction risk
- STOP-02 Sensitive data／key leakage risk
- STOP-03 Unsafe migration
- STOP-04 Platform API impossible

Blocker 格式：

```text
Stop code:
Evidence:
Affected release gate:
Safest temporary behavior:
Work that continues:
Proposed permanent fix:
Spec sections:
Tests required:
```

不得寫成開放式 A／B 選擇題。

---

# 7. ADR 規則

需要 ADR：

- 替換等價套件
- Platform adapter 差異
- Internal module boundary
- Performance optimization
- 可逆 UI 實作細節
- 不改資料契約的測試工具

不得用 ADR 改變：

- Product Scope
- Crypto parameters
- Token format
- Schema required fields
- Security Gate
- File support
- Review requirement
- No-network policy

---

# 8. Code Rules

- TypeScript strict，不使用未說明的 `any`
- Core 純邏輯不得依賴 Obsidian
- 每個外部輸入先 parse／validate
- 每個持久化檔案先 Schema validate
- 所有 sensitive data 只在 encrypted store 或最短生命週期記憶體
- 不 log 原文
- 不使用 dynamic code execution
- 不使用 `eval`／`new Function`
- 不使用 runtime package download
- 不使用 remote fonts／assets
- 不使用 `child_process`，除非安全測試工具且不進 production bundle
- source adapter 不提供 write API
- output adapter 不接受 absolute path from external input
- Crypto code 必須有 vector test
- Error 必須使用 catalog code

---

# 9. Test-first Rules

P0／security 工作：

1. 先新增會失敗的測試。
2. 確認測試確實捕捉 bug。
3. 實作。
4. 局部測試。
5. 全測試。
6. Negative／tamper test。
7. Traceability。

禁止為了讓舊測試通過而保留與 Master Spec 衝突的行為。被規格取代的舊 assertion 必須重寫並在 test comment 標示 superseded Requirement ID。

---

# 10. 自動續作

完成 PR 後，從 Implementation Plan 找出：

- dependencies 已完成
- acceptance 已定義
- 沒有 STOP blocker

的最低 Epic／Task ID，直接開始。

不得回覆「下一步要做什麼？」。

---

# 11. 完成宣告格式

```text
Completed:
Requirement IDs:
Acceptance IDs:
Tests:
Security checks:
Data migration impact:
Artifacts:
Next task selected:
Open release blockers:
```

`Open release blockers` 只能列 STOP-01–04，不能列一般問題。
