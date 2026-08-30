# Hans SafeDoc Office 上線計畫

狀態：NO-GO，完成下列 Gate 前 DOCX／XLSX 維持禁止讀取與輸出。

進度：Gate 0 的 LibreOffice common theme profile 與 unknown theme fail-closed 已完成；Gate 1 的 16 種 source／artifact locator production contract 已完成。既有 adapter locator 明確維持 prototype，待 Gate 3／4 才逐格式遷移，不得視為 Office 已可輸出。

已確認基準：2026-08-30 以本機 LibreOffice headless 產生正常 DOCX／XLSX，兩者都包含 `theme/theme1.xml`。這證明舊規格「一律拒絕 theme」無法覆蓋一般 Office 輸出。此 Mac 有 Microsoft Word、沒有 Microsoft Excel；Excel 原生相容證據必須在 Windows／Excel 環境補齊，不得以 openpyxl 取代。

## 上線範圍

### DOCX

支援一般 OOXML `.docx`：本文、表格、頁首頁尾、註腳／章末附註、註解文字、properties、超連結顯示文字、Word 常見 theme，以及 PNG／JPEG 逐張人工確認。Theme 結構必須精確 allowlist 並保留；可見名稱與字型名稱依 surface policy 掃描，不得整包略過。

第一版阻擋：追蹤修訂、欄位碼、DrawingML 文字／文字方塊、custom XML、巨集、OLE、ActiveX、外部內容、簽章、加密或損壞文件。

### XLSX

支援 formula-free OOXML `.xlsx`：visible／hidden／veryHidden sheets、隱藏列欄、shared／inline strings、文字與格式化數字、工作表名稱、defined names、table names、properties、超連結與 Excel 常見 theme。Theme 結構必須精確 allowlist 並保留；可見名稱與字型名稱依 surface policy 掃描。

第一版阻擋：任何公式或 cached result、calcChain、comments、drawing、chart、media、external links、connections、Power Query、pivot、巨集、OLE、ActiveX、簽章、加密或損壞活頁簿。畫面必須說明如何另存「只有值」版本後再處理。

## 實作順序

### Gate 0：定義「常見 Office」相容 profile

- 建立 Microsoft Word、Microsoft Excel、Google Docs／Sheets 匯出、LibreOffice 各至少一份合成正常 corpus；不得用手工移除 theme 的 package 代表一般使用者檔案。
- 修訂 v1.1 規格與三份 OOXML CSV，精確納入 Word／Excel 常見 theme part、Content Type、relationship、Transitional namespace、QName、attribute、cardinality 與 surface policy。
- Theme 結構走 `PRESERVE_VALIDATED`；人類可讀名稱／字型名稱走 `SCAN_BLOCK` 或明確掃描政策。Unknown theme part、QName、attribute 或 relationship 仍 fail closed。
- 凍結 common profile 後，才開始 adapter production implementation；不能先寫 parser 再回頭修改規格。

驗收：上述四種來源的代表正常 corpus 可通過 inventory；unknown／變造 theme corpus 全部阻擋。

### Gate 1：Locator 與證據型別閉環

- 讓 production contracts 完整表示 schema 中 16 種 source locator 與 artifact locator。
- 每個 locator 必含 source surface hash、logical map hash；artifact locator 另含 artifact surface hash 與 source-to-output map hash。
- validator 必須拒絕 unknown／mixed fields、錯誤 QName、錯誤 package path、無效 sheetRelId／cellRef／range。

驗收：production type／validator 與 v1.1 JSON Schema 的 kind、required fields 完全一致。

### Gate 2：共用 OOXML 封閉式 preflight

- production 必須讀取或等價編譯三份機械正本：OOXML part、relationship、surface CSV。
- 精確驗證 `[Content_Types].xml`、part cardinality、完整 relationship Type URI、source→target、TargetMode、dangling／unused edge。
- 使用 namespace-aware XML traversal 驗證 Transitional namespace、QName、attribute、node kind、surface class；unknown 一律拒絕。
- input／output 都產生 part、relationship、surface count 與 hash manifest。

驗收：unknown QName／attribute／namespace、錯誤 Content Type、錯方向 relationship、dangling／unused part 全部 fail closed。

### Gate 3：DOCX adapter

- 建立跨 `w:r`／`w:t` logical paragraph 與 run-slice map，不得以 `indexOf()` 回找。
- 涵蓋 document、table、header、footer、footnote、endnote、comment、properties、comment author、hyperlink target。
- rewrite 只改被批准的 run slice，保留未涵蓋 XML、run style 與 `xml:space`。
- 圖片以 hash、尺寸、part／relationship 位置逐張顯示；禁止批次接受。
- 獨立 parser 重開 artifact，驗 token、residual、locator、part graph、non-target hashes 與全 entry canary。

驗收：一般 DOCX 真實輸出可由 Word／LibreOffice 開啟；追蹤修訂、欄位、未知 part、未確認圖片均不產生輸出。

### Gate 4：XLSX adapter

- 以 stable sheet relationship ID 定位，不以可變 sheet name 當主鍵。
- 同時掃 raw value、display value、number format、shared／inline string、hidden sheets／rows／columns。
- shared string 採 copy-on-write，只更新目標 cell；被代碼化數值轉文字時在預覽揭露。
- 掃描 sheet name、defined name、table name、properties、hyperlink target；依規格走 SCAN_BLOCK／人工確認。
- 公式與 cached result 必須產生 blocker evidence，任何公式都不建立 artifact。
- 獨立 parser 重開 artifact，驗 token、residual、locator、cell type、sheet graph、non-target hashes 與全 entry canary。

驗收：無公式 XLSX 真實輸出可由 Excel／LibreOffice 開啟；公式、圖表、comments、未知 part 均不產生輸出。

### Gate 5：Obsidian 主流程

- DOCX／XLSX 只在各自 Gate 全綠後由 feature gate 開放，不得只改 picker 副檔名。
- mandatory review、media review、SCAN_BLOCK evidence 必須完整傳到 UI、決策與 export guard。
- 錯誤卡固定顯示白話原因、來源未修改、未建立輸出、修復方式與處理另一份檔案。
- 完成後建立 opaque inspection copy，再交給預設 Word／Excel 開啟；權威 artifact 保持不可變。

### Gate 6：上線驗收

- 合成 corpus、惡意 corpus、Office 真實 round-trip、來源 hash、disk reopen、residual 與結構守恆全部通過。
- macOS／Windows／Linux CI 全綠；Windows clean profile、鍵盤操作、VoiceOver／Narrator、效能與大檔測試完成。
- 獨立安全 reviewer 簽核後，才可把 `docs/RELEASE-READINESS.md` 從 STOP 改為 GO。

## 明確不做

- 不用 LLM 解析或改寫 Office package。
- 不把 Word／Excel 能開啟當作安全證明。
- 不宣稱 byte-identical 或 pixel-identical；安全代碼可能改變換行、頁數或儲存格型別。
- 不為了上線繞過 unknown part、公式、人工圖片審核或 independent reopen Gate。
