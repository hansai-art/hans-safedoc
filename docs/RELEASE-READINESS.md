# Hans SafeDoc v1.1 Phase 1 release readiness

狀態：**STOP, 不得建立或發布 GitHub release。**

Release 判定正本：`RELEASE-CHECKLIST-V1.1.md`。舊 `RELEASE-CHECKLIST.md` 只適用 v1.0 Client／Job／Whole Vault alpha 架構。

## 2026-08-30 11:35 +08:00 current local evidence

以下只證明目前 Mac、唯一合成測試 Vault及本機候選包；不替代 Windows、Narrator、真人 UX 或非作者安全簽核。

- 正式產品入口只有 MD／TXT／CSV；manifest、picker、runtime、README 與新手教學不再宣稱支援 DOCX／XLSX。Office 維持 fail closed。
- Obsidian 1.13.7 冷載入確認版本 `1.1.0`，description 為 `Read-only local pseudonymization for MD, TXT, and CSV with manual review.`。
- 模型正式分發已明確排除：第三方候選缺完整授權／來源鏈；零外部權重自建候選雖有可重建provenance，但第三版獨立品質Gate僅precision 41.7%、overall recall 35.7%、PERSON recall 0%、ORG recall 71.4%，未達既定門檻，沒有降標。
- clean-room release source不含model catalog、model builder、模型檔、downloader、manager或ONNX runtime。首次設定、Help與production `main.ts`無模型安裝、匯入或推論入口，正式artifact不得含`.hsmodel`、ONNX、vocab或labels。因此GPL／模型provenance法律Gate不再是本release blocker。
- 2026-08-30在Obsidian 1.13.7以PKTAP、Electron NetLog及runtime hooks完成D-NET-01：180秒內完成合成MD／TXT／CSV完整流程，runtime網路事件0、capture drops 0、SafeDoc未建立外部request／DNS／socket。舊D-NET-02模型安裝PASS只保留為歷史研究證據；目前release無模型網路面，需在fresh build確認UI沒有模型入口且所有文件流程零外連。
- 合成練習 workflow正式只使用20個固定規則候選。D-NET-01實機重跑確認MD／TXT／CSV三份來源SHA-256與mtime前後相同，新增三份匿名輸出且未覆寫；手機與Email原文殘留均為0。MD來源SHA-256前後同為 `f2c37df4cce256216bb69b7c853399824bddbf64d2846eba79e3a02535983328`。
- 900×700 狹窄 Obsidian 視窗實測無橫向 overflow、按鈕或文字裁切；這不替代 keyboard-only、VoiceOver、Narrator真人驗收。
- 真實Obsidian AX Tree自動檢查確認新手教學與工作區操作按鈕都有可讀名稱，Tab可進入主要操作，Escape可關閉modal；過程發現並修正「Privacy Bridge 新手教學」舊品牌ARIA，重建後回讀為「Hans SafeDoc 新手教學」。此證據不替代VoiceOver／Narrator真人簽核。
- 最新完整自動化：124 files passed、256 tests passed、2 個明確 manual tests skipped；88 個 acceptance tests通過並映射 `105/105`驗收項。format、lint、typecheck、build、26 個 v1.1／v1.0 schema、network、secret、license、spec、synthetic corpus及 `git diff --check` 全部通過。
- v1.1 spec validator：`159 clauses, 66 acceptance rows, 38 parts, 28 relationships, 298 surfaces`。
- 產生 1,000 份、52,493,000 bytes 的純合成效能 fixture；產生耗時 0.81 秒、最大 RSS 118,226,944 bytes。這不是 UI 掃描 benchmark pass。
- 50 MB單檔自動 smoke通過：scan 2.51秒、2,000 candidates、preview 0.19秒、1,000 hunks、最大RSS 382,648,320 bytes、0 swap；仍需真實Obsidian UI與真人threshold決策。
- 舊本機驗收目錄曾另附`.hsmodel`，現已失效且不得作目前候選；下一份artifact只能含plugin三檔與release證據，不得含任何模型資產。
- `.github/workflows/release.yml` 已實作版本tag與manifest版本一致檢查、完整 `pnpm ci` Gate，以及 `main.js`、`manifest.json`、`styles.css`、ZIP、checksums、SBOM與provenance直接release assets。尚未push tag或建立GitHub Release，公開URL與HTTP 200仍無證據。
- Git branch `main`、HEAD `232ff856a4f257ad0e23418e2d1613309ef0f233`；工作樹仍高度 dirty，正式 release script 應繼續拒絕，不能把本機候選冒充 source-commit-bound artifact。

目前 Phase 1 blocker：clean-tree可重現 artifact、macOS／Windows fresh profile、keyboard／VoiceOver／Narrator、50 MB單檔與重複掃描效能決策、非作者安全 review及 Hans UX接受。模型因不分發而不再是blocker。正式對外操作仍需 Hans另行明確授權。

自動化證據由 `pnpm run ci`、`pnpm run clean:machine` 與個別 acceptance/hardening 指令產生。它們只能證明本機 Node 環境的行為。

## Gate D 必要人工證據

- macOS 的新 Obsidian profile 全流程，含安裝、鎖定、解除鎖定、Backup、Import、uninstall/upgrade/rollback。
- Windows 的新 Obsidian profile 相同全流程。
- 鍵盤-only workflow、screen reader labels 與 focus order 的人工走查。
- 50 MB/1,000 notes benchmark 的時間與記憶體紀錄。
- 獨立安全 reviewer 對 Threat Model、crypto/storage 的簽核。

未完成上述項目之前，任何自動測試通過都不是 Gate D 通過證據。

## 可自動重現

```sh
pnpm run clean:machine
pnpm run release:artifact
```

release artifact 會包含 plugin bundle、manifest、SBOM、SHA-256 清單與 artifact manifest；產出前會進行 read-back 驗證。
