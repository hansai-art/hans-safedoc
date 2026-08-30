## Why

Hans SafeDoc 已能安全處理 MD、TXT、CSV，但 Word 與 Excel 是日常文件的主要交換格式；目前 DOCX／XLSX adapter 雖已有 preflight、typed locator、rewrite 與 reopen 基礎，Host 仍明確阻擋，使用者無法完成端到端安全副本流程。此變更以 fail-closed 的窄型 OOXML profile 正式放行 DOCX 與無公式 XLSX，並建立可重建、可公開下載及可送 Obsidian Community Plugins 審核的 release。

## What Changes

- 新增 DOCX 正式流程：正文、表格、頁首、頁尾、註腳、章末附註與註解本文可掃描及局部改寫；文件屬性、註解作者、超連結與圖片進強制人工決策。
- 新增 XLSX 正式流程：可見／隱藏／veryHidden 工作表、shared strings、inline strings、文字與允許的格式化數字可掃描及局部改寫；sheet names、defined names、metadata、hyperlinks 進強制人工決策。
- DOCX／XLSX 只接受機械 allowlist 內的 part、Content Type、relationship、QName 與 attribute；巨集、加密、OLE、ActiveX、tracked revisions、未知結構，以及 XLSX 公式、cache、comments、charts、drawings、external data、Power Query、pivot 一律 fail closed 且不得產生輸出。
- Host 將 DOCX／XLSX 接入既有「選擇檔案 → 掃描 → 人工審核 → 預覽 → 原子輸出」流程，來源 bytes 與 SHA-256 全程不變，輸出名稱不含來源檔名且不覆寫。
- 正式版維持固定規則、無模型、無模型下載／匯入、無 ONNX runtime；更新所有文案與發布守門。
- 建立 clean source commit、可重建 artifact、checksums、SBOM、GitHub Release；若 registry 尚未收錄，建立 Community Plugins submission，並將外部審核狀態與公開 Release 狀態分開回報。

## Capabilities

### New Capabilities

- `office-ooxml-safe-copy`: DOCX 與 XLSX 的窄型安全 profile、掃描、強制人工決策、局部改寫、獨立重開、residual、graph conservation 與原子發布。
- `office-host-workflow`: Obsidian Desktop 中 DOCX／XLSX 的選檔、錯誤說明、審核、預覽、輸出與完成狀態。
- `verified-public-release`: clean source、版本一致性、可重建 artifact、公開 GitHub Release 資產回讀及 Community Plugins submission 狀態。

### Modified Capabilities

無既有 OpenSpec capability；v1.2 以 versioned supersession 擴充歷史 v1.1 文件，不改寫 frozen v1.0／v1.1 正本。

## Impact

- 受影響程式：`packages/document-formats/src/{docx,xlsx,ooxml}`、`packages/obsidian-plugin/src/external-format-workflow.ts`、支援矩陣、Help／onboarding、release scripts。
- 受影響驗收：OOXML mutation corpus、DOCX／XLSX adapter tests、Host integration、來源 hash、失敗無輸出、真實 Vault 操作、release artifact readback。
- 不新增遠端服務、模型、遙測或執行期依賴下載；外掛維持 Desktop-only 文件 I/O 邊界。