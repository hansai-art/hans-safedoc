# Security Policy

## Release Candidate Notice

Hans SafeDoc 1.1.0 尚未正式發布。在實際 release commit 完成獨立安全審查、跨平台及人工驗收前，只能使用純合成或測試資料，不得處理正式客戶資料。

## Reporting

Do not open a public issue containing:

- customer data
- source note excerpts
- Mapping
- dictionary terms
- Passphrases
- keys
- full filesystem paths
- real tokens tied to a production Job

Use the repository's private security advisory process. Include only safe Error Codes, opaque IDs, version, OS family and reproduction steps using synthetic data.

## Supported Versions

正式發布後，只維護最新標記版本。目前尚無受支援的正式版本。

## Security Invariants

- Original Vault is read-only.
- 文件讀取、掃描、推論、預覽與輸出沒有網路路徑或遙測。唯一例外是使用者主動選擇線上安裝模型時，由固定 HTTPS 來源下載固定 revision 的模型資料，並逐檔驗證大小及 SHA-256。
- Mapping and dictionary remain outside the Vault and encrypted.
- Unknown or cross-job tokens are rejected.
- Secret values are never reversibly tokenized.
