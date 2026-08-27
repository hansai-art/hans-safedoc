# Privacy Bridge v1.0 release readiness

狀態：**STOP, 不得建立或發布 GitHub release。**

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
