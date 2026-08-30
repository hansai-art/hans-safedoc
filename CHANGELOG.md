# Changelog

## 1.2.3 — 2026-08-31

- 修正release ZIP的Unix檔案權限，解壓後為可讀的0644，不再產生mode 000檔案。

## 1.2.2 — 2026-08-31

- 修正Office replacement token偶然包含原始短字串時的殘留誤判；只移除本次精確replacement後再檢查其餘解析surface，未放寬殘留阻擋。

## 1.2.1 — 2026-08-31

- 修正clean tag release workflow呼叫方式；產品功能與1.2.0相同。
- 修正Windows checkout換行、Office fixture URL、POSIX mode斷言與SBOM pnpm啟動的跨平台Gate。

## 1.2.0 — 2026-08-31

- 正式支援通過精確allowlist的DOCX與XLSX安全子集；未知OOXML、巨集、OLE、外部資料、修訂、公式、註解及其他未關閉surface一律fail closed。
- Office文字候選使用typed locator局部改寫；同一XLSX儲存格的多個候選先合併為單一cell operation。
- metadata、超連結、文件／工作表名稱、主題與圖片設為不可批次的逐項人工確認；確認後原樣保留並在畫面明示。
- Office輸出採暫存、獨立重開、殘留掃描、OOXML graph conservation、來源SHA-256不變及不碰撞opaque檔名。
- OOXML規則CSV在build時確定性內嵌bundle，並以來源hash回歸測試防止規則漂移或CJS runtime找不到docs。

## 1.1.0 — Unreleased historical baseline

- 正式Phase 1支援Markdown、嚴格UTF-8 TXT及結構安全CSV；DOCX、XLSX、PDF與其他格式明確阻擋或提供安全替代路徑。
- 加入首次啟動安全說明、可選純合成練習筆記、完整新手教學與格式中立的人工審核／預覽／輸出流程。
- 正式版移除本機NER分發：release source不含catalog、模型檔、downloader、model manager或ONNX runtime；首次設定與主程式無模型安裝、匯入或推論入口。
- 第三方模型因授權／來源鏈不完整排除；零外部權重自建模型因獨立品質Gate失敗排除。固定規則workflow不受影響。
- 強化來源唯讀、CSV方言判斷、stale state、輸出碰撞、殘留掃描、供應鏈hash、ZIP安全、SBOM與release artifact Gate。
- 正式發布仍須完成非作者安全審查、跨平台、VoiceOver／Narrator、真人UX及clean source commit Gate；模型法律審查因不分發模型而不再是release blocker。

## 1.0.0-spec — 2026-08-25

- Locked product, architecture, security and data-contract decisions.
- Added Product & Engineering Master Specification.
- Added 18 JSON Schemas and matching examples.
- Added 105-item Acceptance Matrix.
- Added Threat Model, UX State Map, Migration/Recovery, Release Gates and Implementation Plan.
- Added fixed cryptographic parameters and cross-platform test vector.
- Classified existing recognizer code and tests as legacy regression seed.
