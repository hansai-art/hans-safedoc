# Hans SafeDoc 1.1 Phase 1 Threat Model

版本：1.1.0 release candidate  
範圍：Obsidian Desktop 外掛，正式入口僅含 Markdown、嚴格 UTF-8 TXT與結構安全 CSV；不分發或載入本機 NER 模型。

## 1. 安全目標

1. 原始文件保持唯讀，不因掃描、預覽或輸出而修改。
2. 未接受目前版本安全告知前，不讀取任何文件。
3. 所有固定規則候選都必須人工確認。
4. 安全輸出必須寫入 Vault 外的新路徑，不覆寫來源，且重新開檔與殘留檢查通過。
5. 文件讀取、掃描、預覽與輸出零網路、零遙測。
6. 正式版沒有模型下載、模型匯入或模型推論網路例外。
7. 不可信CSV與文件不得造成任意程式執行或半套輸出。

## 2. 不在 Phase 1 支援範圍

- DOCX、XLSX：前台與runtime阻擋；底層研發程式不構成產品支援。
- PDF：外掛不直接解析，只提供本機確定性轉 Markdown 路徑。
- 手機版、整個 Vault 掃描、自動接受候選、安全還原、雲端模型、遙測。
- 法律上的匿名化保證。Hans SafeDoc提供可逆假名化與人工審核流程。

## 3. 信任邊界

| 邊界 | 不可信輸入 | 控制 |
|---|---|---|
| Obsidian Vault | MD內容、其他外掛、同步功能 | 安全告知Gate、來源唯讀、建議專用Vault／profile |
| 外部檔案 | TXT／CSV bytes、路徑、編碼、CSV結構 | 嚴格UTF-8、確定性parser、模糊時詢問、active content阻擋 |
| 輸出檔案系統 | 路徑碰撞、來源變更、staging中斷 | opaque檔名、不可覆寫、hash recheck、atomic staging、獨立重開 |
| 模型研究程式 | 未達品質或來源Gate的候選資產 | 不進clean-room source；release source與artifact皆無catalog、模型檔、downloader或runtime |
| Build／Release | dependency、stale dist、版本漂移、artifact污染 | frozen lockfile、版本六方一致、SBOM、checksums、dirty-tree拒絕、ZIP獨立回讀 |

## 4. 主要威脅與控制

### T1 未告知即處理文件

- 威脅：使用者關閉首次設定後直接使用工具列或指令。
- 控制：所有選檔、MD掃描、預覽與輸出入口共用目前版本安全告知Gate；未接受時清除session、重開告知且文件read count必須為0。
- 證據：`tests/core/e17-novice-onboarding.test.ts`、真實Obsidian runtime read攔截。

### T2 文件內容外傳

- 威脅：production source或bundled dependency使用computed URL、fetch、XHR、WebSocket或Node socket外傳。
- 控制：final bundle對網路能力零容忍；production主程式沒有模型downloader或runtime import，catalog不含URL。
- 證據：`scripts/network-scan.mjs`、`security/network-deny.test.ts`；computed URL regression必須被拒絕。
- 殘餘：正式release前仍需在真實Electron host攔截 webRequest、fetch、XHR、WebSocket、http／https／net／tls，保存所有文件流程零連線證據。

### T3 模型資產誤入release

- 威脅：研究用第三方或自建候選被誤包成正式asset，重新引入授權、來源或品質風險。
- 控制：clean-room release source沒有model catalog、model builder、downloader、manager、runtime或模型測試資產；首次設定與`main.ts`無模型入口。
- 證據：release source inventory、bundle content scan及release ZIP allowlist。
- 殘餘：release artifact仍須掃描並拒絕`.hsmodel`、`.onnx`、`vocab.txt`與`labels.txt`。

### T4 模型能力被重新引入

- 威脅：未來維護時重新加入model catalog、downloader、manager或runtime。
- 控制：release source inventory與bundle scan要求上述程式及模型資產不存在；任何重新引入都必須另提規格並重走授權、品質、網路與非作者Gate。

### T5 模型品質不足

- 威脅：未達門檻的模型漏判或誤報人名／組織。
- 控制：第三版零外部權重模型品質Gate失敗後停止迭代並排除正式分發，不降低門檻；正式workflow只使用固定規則與人工檢查。

### T6 來源被修改或輸出殘留

- 威脅：審核期間來源改變、輸出覆寫、敏感原文殘留、取消後留下半成品。
- 控制：多階段source hash recheck、staging、opaque non-overwriting filename、磁碟重新開啟、residual scan、取消清理。
- 證據：`tests/core/e19-external-format-workflow.test.ts`及source-readonly／residual tests。

### T7 CSV公式或結構誤判

- 威脅：公式被試算表執行、引號損壞、欄數不一致、模糊delimiter被猜測。
- 控制：comma／Tab／semicolon確定性枚舉；只有唯一安全解才自動使用，模糊時人工確認，active content及損壞輸入fail closed。

### T8 惡意或過度權限的其他Obsidian外掛

- 威脅：其他外掛讀取同一Vault、UI或記憶體。
- 控制：首次告知明示；正式資料要求專用Vault／profile、只啟用允許外掛、關閉同步。Hans SafeDoc無法在同一renderer內對惡意外掛提供強隔離。

### T9 Release artifact與SBOM不一致

- 威脅：stale dist、版本漂移、缺SBOM、ZIP損壞、工作樹未提交。
- 控制：dirty-tree先阻擋；root／plugin source／dist manifest、root／plugin package及versions一致；build後manifest byte equality；artifact manifest綁定payload hash；ZIP以獨立parser逐entry回讀。

## 5. 人工與外部Gate

下列項目不能由作者或自動測試代簽：

- 非作者安全review。
- macOS與Windows fresh-profile安裝、升級、回滾、移除。
- VoiceOver、Narrator、keyboard-only與真人UX驗收。
- 50 MB真實Obsidian UI效能接受標準。
- Hans對支援範圍、固定規則限制及人工審核UX的接受。

任一項未完成時，`docs/RELEASE-READINESS.md`必須維持STOP。
