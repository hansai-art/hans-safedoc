# Hans SafeDoc v1.1 Phase 1 Release Checklist

狀態：**STOP**。本文件是 v1.1 MD／TXT／CSV 正式上架的 release 正本；DOCX／XLSX 維持產品內阻擋，另由 `OFFICE-LAUNCH-PLAN.md` 管理。

## A. Phase 1 產品範圍

- [x] 正式入口只有 MD、嚴格 UTF-8 TXT、可確定判斷分隔符的 CSV。
- [x] DOCX／XLSX 顯示開發中且 runtime fail closed。
- [x] PDF 說明先用本機確定性工具轉 Markdown。
- [x] DOC／XLS／RTF／ODT／ODS／圖片／Canvas／Bases 明確說明不處理。
- [x] README、首次設定、Help View、picker 與 runtime 使用相同格式政策。
- [x] manifest 不宣稱支援 DOCX／XLSX。

## B. 核心安全與格式 workflow

- [x] 來源唯讀，輸出不覆寫來源，來源 SHA-256 前後相同。
- [x] MD／TXT／CSV inventory、人工審核、二次確認、預覽、輸出及處理下一份檔案閉環。
- [x] TXT BOM／換行保留；CSV comma／Tab／semicolon deterministic dialect；模糊與損壞輸入 fail closed。
- [x] stale state、source change、output collision、token、residual、secret、network 與 ZIP 防線有自動測試。
- [x] 最新完整 suite 為 124 files、256 tests passed、2 個明確 manual tests skipped；88 個 acceptance tests通過，映射105／105驗收項。
- [x] format、lint、typecheck、build、schema、spec、corpus、network、secret、license、diff check 全綠。

## C. 首次設定與固定規則模式

- [x] 合成練習筆記只在使用者 opt-in 後建立，也可跳過或使用自己的 MD。
- [x] 固定規則完整可用，不需要 Ollama、LLM或本機NER模型。
- [x] clean-room release source不含model catalog、builder、模型檔、downloader、manager或ONNX runtime。
- [x] 首次設定、Help與production `main.ts`無線上安裝、離線匯入或模型推論入口；舊`localModelEnabled`設定會被關閉。
- [x] 第三方候選因授權／來源鏈不完整排除；零外部權重自建候選因獨立品質Gate失敗排除，未降低門檻。
- [x] 模型分發法律Gate為N/A：本release不含`.hsmodel`、ONNX、vocab、labels或第三方模型license，不再是release blocker。

## D. 本機 artifact 與文件

- [x] 舊本機驗收曾產生獨立`.hsmodel`作研究證據；它已排除於目前release範圍，不得隨正式artifact發布。
- [x] ZIP allowlist 只有 `privacy-bridge/main.js`、`manifest.json`、`styles.css`，無 macOS `._*` 資源分支。
- [x] release artifact腳本強制dirty-tree先阻擋、六方版本metadata一致、build manifest byte equality、包內SBOM、全payload checksums、逐entry ZIP重讀及獨立ZIP SHA-256；CI release job已補build、clean-machine流程已補SBOM。
- [ ] [BLOCKER] 工作樹乾淨，所有 release 內容對應一個已記錄 source commit。
- [ ] [BLOCKER] clean-machine frozen install、完整 CI、build、SBOM 與 release artifact 可重現。
- [ ] [BLOCKER] 正式 artifact 直接提供 `main.js`、`manifest.json`、`styles.css`、SBOM、checksums 與 artifact manifest。
- [ ] [BLOCKER] install／upgrade／rollback／uninstall、SECURITY、Threat Model、CHANGELOG、README、versions metadata 最終一致。

## E. 人工與跨平台 Gate

- [ ] [BLOCKER] macOS fresh Obsidian profile 的安裝、首次設定、MD／TXT／CSV、固定規則模式、升級、回滾、移除全流程。
- [ ] [BLOCKER] Windows fresh Obsidian profile相同全流程；Linux best-effort。
- [ ] [BLOCKER] keyboard-only、focus order、Escape、VoiceOver、Narrator 與 screen-reader labels 真人驗收。
- [x] 真實Obsidian AX Tree自動檢查：新手教學與工作區操作按鈕皆有可讀名稱，Tab可進入「下一步：模型說明」，Escape可關閉modal；並修正殘留的Privacy Bridge舊品牌ARIA。此項不取代前列真人驗收。
- [ ] [BLOCKER] 50 MB單檔自動 benchmark已完成：scan 2.51秒、2,000 candidates、preview 0.19秒、1,000 hunks、最大RSS 382,648,320 bytes、0 swap；尚缺真實Obsidian UI重複掃描與真人release threshold決策。
- [ ] [BLOCKER] 非作者安全 reviewer 對 Threat Model、crypto、storage與 Phase 1 rewrite 簽核。
- [ ] [BLOCKER] Hans 接受 Phase 1 支援範圍、固定規則限制與人工審核 UX。

## F. 正式對外發布

- [ ] 所有 blocker 完成後，`RELEASE-READINESS.md` 才能由 STOP 改為 GO。
- [ ] Hans 明確授權後才能 commit／push／tag、建立 GitHub Release及送 Obsidian Community Plugins。
- [ ] tag 與 manifest version 完全一致；GitHub Release 非 draft／非 prerelease。
- [ ] GitHub Release 的 `main.js`、`manifest.json`、`styles.css` 下載 URL 都實測 HTTP 200。

Office 說明：DOCX／XLSX 只有在 `OFFICE-LAUNCH-PLAN.md` 的共同 OOXML、格式安全、獨立 reopen 與相容性 Gate 全部通過後才能解除產品阻擋；Office 未解鎖不降低 Phase 1 對外說明的誠實性。