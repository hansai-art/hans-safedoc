# Hans SafeDoc 產品完成與正式放行 Execution Spec

狀態：EXECUTING；正式 release 仍為 STOP，只有全部 Release Gate 有可讀回證據後才能改為 GO。

## 1. 產品完成定義

「完成」必須同時滿足以下七層，不得把較低層宣稱成較高層：

1. 可 build：TypeScript、lint、format、bundle 通過。
2. 可安裝：乾淨 Obsidian profile 可安裝且 manifest／版本一致。
3. 可載入：外掛啟動、鎖定／解鎖、錯誤回復正常。
4. 格式 workflow 可用：該格式可 inventory、review、rewrite、輸出。
5. 格式安全閉環完成：來源唯讀、精準 locator、獨立重開、residual、canary、graph conservation 全過。
6. 全產品驗收完成：支援矩陣、跨平台、人工 UX／無障礙／安全審查全過。
7. 可正式上架：乾淨可重現 artifact、checksums、SBOM、簽核與 release metadata 全齊。

## 2. Release Scope

### 2.1 Phase 1 正式支援

- Markdown、TXT、CSV：純確定性處理，不使用模型。
- DOCX：本文、表格、頁首頁尾、註腳、章末附註、註解、core／app／custom metadata、超連結、common theme；圖片必須有完整逐張人工決策鏈。
- XLSX：無公式活頁簿；sheet names、defined names、table names、shared／inline strings、raw／display values、number formats、dates、metadata、comments、hyperlinks、hidden／veryHidden sheets、merged cells、common theme。
- PDF：外掛不解析；只接受本機確定性工具轉成 Markdown 後進入既有流程。

### 2.2 Phase 1 明確阻擋

- DOCM／XLSM、巨集、OLE、ActiveX、嵌入物件、外部連線、Power Query、pivot、圖表、公式與 formula cache、tracked revisions、未登錄 namespace／QName／attribute／relationship／part。
- 阻擋時來源 hash 必須不變，不得建立安全副本，UI 必須說明原因與下一步。

### 2.3 Phase 2

- 可選、完全本機的小模型只增加姓名、組織、地址及語意敏感內容候選。
- 模型不得判斷 delimiter、encoding、ZIP／OOXML 結構、批准輸出、寫檔、執行工具或讀取其他文件。
- 所有安全輸出仍由確定性核心驗證。

## 3. 不可違反的安全不變量

1. 只使用 `/Users/jugang11/Documents/Hans SafeDoc Test Vault` 與純合成資料；不得讀正式 Vault 或真實敏感文件。
2. 原始來源唯讀，處理前後 SHA-256 相同。
3. 不 whole-file reserialize，不 unzip 後全域替換再 zip。
4. 只改已允許 part、relationship、namespace、QName、attribute 與 typed locator 指定位置。
5. 未知或未閉環 feature 一律 fail closed。
6. artifact 寫入磁碟後，由獨立 parser path 重開；不得重用 rewrite adapter 記憶體或 scan 結果。
7. 輸出不覆寫既有檔案，檔名不含原始檔名。
8. 人工 review Gate 不得由 Agent 代替使用者接受。
9. 不 commit、push、tag、建立 GitHub Release 或送 Obsidian Community Plugins，除非 Hans 另行明確要求。

## 4. Implementation Gates

### Gate 0：真實 common theme profile

完成條件：

- LibreOffice 正常 DOCX／XLSX theme 可 inventory，且 theme display-name surface 進人工審核。
- unknown namespace、element、attribute、多根、重複屬性 fail closed。
- 真實 synthetic corpus 有 SHA-256 與 verifier。

目前：完成。

### Gate 1：證據 locator contract

完成條件：

- 16 種 source locator 與 artifact locator 有 exact runtime validator。
- locator 綁定 source surface hash、mapping hash、artifact surface hash、source-to-output map hash。
- 舊 adapter locator 明確標為 prototype，不得冒充 production evidence。

目前：完成。

### Gate 2：共同 OOXML package closure

實作：

- 機械讀取或由單一生成來源編譯三份 machine contract：part／Content Type、relationship、surface。
- 精確解析 `[Content_Types].xml` Default／Override；拒絕 duplicate、conflict、missing、unknown mapping。
- 解析每個 `.rels` 的 source part、完整 Type URI、Target、TargetMode、direction、cardinality。
- OPC URI resolution：`.`、`..`、percent encoding、leading slash、fragment、query、Unicode；拒絕 package escape。
- 建立 part graph／relationship graph；拒絕 dangling targets、未使用敏感 part、重複 Id、非法 external target。
- namespace family、QName、attribute、text／attribute surface class 逐節點 traversal。
- ZIP limits：entry 數、單 entry、總解壓量、compression ratio、XML depth／node／attribute／text ceilings。
- input→output Content Types、part graph、relationship graph conservation。

驗收：RED fixture 先行；正常 LibreOffice corpus 通過，惡意 mutation corpus 精確失敗；無 string-suffix relationship 判斷。

### Gate 3：DOCX production closure

依 slice TDD：

1. document body 與跨 run text。
2. tables。
3. headers／footers。
4. footnotes／endnotes。
5. comments author／body。
6. core／app／custom properties。
7. hyperlinks：internal／external policy、display text、target review。
8. DrawingML text 與 common theme surfaces。
9. media inventory：hash、MIME、尺寸、relationship、位置、逐張人工決策 propagation。
10. transaction rewrite：只改 locator 指定 XML text／attribute，不重排未改 bytes。
11. 磁碟 artifact 獨立 reopen、decision-aware residual、canary、graph conservation。

放行條件：所有 mandatory DOCX acceptance fixtures、tests、evidence JSON 存在且可重現；Microsoft Word／LibreOffice 開啟不出現 repair prompt。

### Gate 4：XLSX production closure

依 slice TDD：

1. workbook／worksheet identity 與 relationship resolution。
2. sheet names、hidden／veryHidden。
3. defined names、table names。
4. shared strings、inline strings、rich text provenance。
5. raw values、display values、number format、dates；XLSX-specific candidate policy 避免一般數字誤判郵遞區號。
6. metadata、comments、hyperlinks。
7. merged cells。
8. 無公式 allow profile；任何 formula／cache、chart、macro、external data、Power Query、pivot fail closed。
9. 精準 rewrite、磁碟 artifact 獨立 reopen、residual、canary、workbook graph conservation。

放行條件：11 個 XLSX acceptance groups 與 evidence 全部存在；Microsoft Excel／LibreOffice 開啟不出現 repair prompt。

### Gate 5：Obsidian end-to-end closure

- DOCX／XLSX 只有 Gate 2＋對應格式 Gate 全過才從 blocker allowlist 移除。
- inventory、candidate review、人工決策、二次確認、輸出、錯誤回復、處理另一份文件完整串接。
- stale state、source change、output collision、crash／cancel 不得留下可誤用 artifact。
- 圖片／theme／hyperlink 等 mandatory review records 必須逐項傳到 UI 與 export guard。
- 新手文案說明支援範圍、阻擋原因、輸出位置與下一步。
- 用合成資料於唯一測試 Vault 完成真實安裝與操作驗收。

### Gate 6：產品級自動化與效能

- `format:check`、lint、typecheck、完整 tests、105 acceptance、build、spec validator、corpus verifier、diff check 全綠。
- Phase 1 單檔 workflow 的 50 MB 合成檔有時間與記憶體證據。1,000 notes fixture 只用於重複掃描／穩定性測試，不得把它誤寫成不存在的 Whole Vault UI 功能。
- Office ZIP ceilings、超大 shared strings／XML depth benchmark 是解除 DOCX／XLSX 阻擋的格式 Gate；Office 未進 Phase 1 正式範圍時，不阻擋 MD／TXT／CSV release。
- fuzz／mutation suites 覆蓋 ZIP、XML、relationship、locator、token、residual。
- source tree／bundle network deny、secret scan、license scan、lockfile、SBOM 全過。
- clean machine rebuild 可重現。

### Gate 7：人工與跨平台 release Gate

必須由真實環境／真人完成，不得由本機自動測試代替：

- macOS、Windows clean Obsidian profile 全流程；Linux best-effort。
- Phase 1 的 MD／TXT／CSV 在 macOS／Windows 的原生文字編輯器與試算表匯入相容性。
- Microsoft Word、Microsoft Excel、Google Docs／Sheets export、LibreOffice 的 Office compatibility matrix，只是 DOCX／XLSX 解除阻擋前的必要格式 Gate；Office 維持阻擋時不冒充 Phase 1 release blocker。
- keyboard-only、VoiceOver、Narrator、focus order、screen-reader labels。
- 非作者安全 reviewer 對 Threat Model、crypto、storage、OOXML rewrite 的簽核。
- Hans 對圖片處置、UX 與支援範圍的人工接受。

### Gate 8：Release artifact

- 工作樹乾淨且 source commit 已記錄。
- bundle、manifest、versions、README、SECURITY、Threat Model、CHANGELOG、install／upgrade／rollback 文件一致。
- 產生非空可解析 CycloneDX SBOM、SHA-256 checksums、artifact manifest；read-back 自我驗證。
- 只有 Gate 0～8 證據齊全，才能把 `docs/RELEASE-READINESS.md` 從 STOP 改為 GO。
- tag、GitHub Release、Community Plugins submission 屬對外不可逆動作，另需 Hans 明確指示。

## 5. Overnight execution order

截至 08:00 的自動執行優先序：

1. Gate 2 common OOXML package closure。
2. Gate 3 DOCX deterministic slices。
3. Gate 4 formula-free XLSX deterministic slices。
4. Gate 5 Obsidian propagation 與 synthetic end-to-end。
5. Gate 6 完整本機驗證、artifact dry run、獨立 code review。
6. 產生 08:00 evidence report，逐條區分完成、失敗、外部 blocker、真實 release 狀態。

風險最高的共同 OOXML 核心先做；若它未閉環，Office UI 絕不解鎖。任何 phase 失敗時保留 STOP，繼續完成不依賴該失敗的測試、文件與證據，不降低標準。

## 6. 08:00 報告合約

報告必須包含：

- 實際修改與可操作成果。
- 最新完整測試／acceptance／build 輸出。
- DOCX、XLSX 各自達到哪一層完成定義。
- 未完成項目與根因。
- 外部人工／Windows／Microsoft Excel blockers。
- 是否有 clean artifact、checksum、SBOM。
- `RELEASE-READINESS` 真實 STOP／GO，不得用期待代替證據。
