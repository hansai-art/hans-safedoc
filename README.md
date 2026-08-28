# Privacy Bridge v1.0 LOCKED Specification Package

這是一套可直接交給工程師或 AI Coding Agent 執行的產品與工程規格。產品端決策已鎖定，實作者不得以一般產品細節為由等待額外回覆。

## Alpha 新手安裝與合成資料驗收

> Alpha 只供合成資料測試，不得放入客戶、員工、憑證或正式資料。

1. 從 GitHub Releases 下載 `privacy-bridge-alpha.zip`。
2. 解壓後將 `main.js`、`manifest.json` 放到 `<Vault>/.obsidian/plugins/privacy-bridge/`。
3. 在 Obsidian 的 Community Plugins 啟用 Privacy Bridge，或執行 `obsidian plugin:reload id=privacy-bridge`。
4. 打開 `demo-vault/Project-Aurora.md`，執行 `Privacy Bridge: Scan current note`。
5. 在右側 Privacy Bridge View 逐項選擇「接受並去識別化」或「忽略並保留原文」。
6. 所有候選均完成審核後，按「建立轉換預覽」，確認純文字 Markdown 預覽。
7. 按「建立去識別化輸出」。輸出位於來源 Vault 同層的 `Privacy Bridge Outputs/`；來源 Markdown 必須保持不變。

這個 Alpha 垂直流程不使用 LLM、Ollama、遠端 API 或模型下載。偵測與 tokenization 全部在本機執行。

## 開始閱讀

1. `docs/MASTER-SPEC.md`：唯一最高規格
2. `docs/DECISION-REGISTER.md`：已鎖定決策
3. `docs/IMPLEMENTATION-PLAN.md`：固定 Merge Order 與 Epic
4. `docs/ACCEPTANCE-MATRIX.md`：105 項驗收
5. `schemas/`：18 份 machine-readable data contracts
6. `docs/THREAT-MODEL.md`：威脅模型
7. `docs/UX-STATE-MAP.md`：畫面、狀態與按鈕規則
8. `docs/MIGRATION-AND-RECOVERY.md`：備份、復原、刪除與遷移
9. `docs/RELEASE-CHECKLIST.md`：Release Gates
10. `docs/ENGINEER-EXECUTION-PROTOCOL.md`：不中斷執行規則

## 規格優先順序

```text
MASTER-SPEC
→ JSON Schema
→ Acceptance Matrix
→ Golden Fixtures
→ Decision Register
→ Implementation Plan
→ GitHub Issue
→ Code comments
→ Existing code
```

## 現有程式碼

`reference/legacy-seed/` 只作為規則與測試起始素材，不是規格來源。既有 79 個測試不得被用來宣稱企業資料準確率；它們只是最低回歸基線。

## 開放產品決策

```text
0
```

發現未明確描述的實作細節時，依 `ENGINEER-EXECUTION-PROTOCOL.md` 的安全優先順序自行決定，不等待產品負責人。

## Release Stop

只有以下四類可以阻擋 Release，但其他工作繼續：

- STOP-01：可能毀損原始資料
- STOP-02：可能洩漏原始資料、Mapping 或金鑰
- STOP-03：無法安全遷移
- STOP-04：必要平台 API 不存在且無安全替代

## 套件驗證

`BUILD-REPORT.md` 列出：

- Schema 數量與驗證結果
- Acceptance Matrix 項目數
- Crypto test vector
- 規格檔案 Hash
- Legacy seed 是否成功納入
