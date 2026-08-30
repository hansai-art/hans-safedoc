# Obsidian 真實 Host 網路證據 Runbook

狀態：**D-NET-01 PASS；D-NET-02 PASS**。文件流程與fresh SafeDoc外掛狀態的線上模型安裝，均已在真實Host完成三層驗證。

## 證據範圍

三層必須同時保存：

1. macOS PKTAP／tcpdump：真實程序封包。
2. Electron `--log-net-log`：Chromium／Electron網路堆疊。
3. `scripts/record-obsidian-network-evidence.mjs`：renderer及Node API呼叫來源。

單獨CDP不能證明Node `http／https／net／tls`；單獨封包也不能還原TLS內完整URL。

## 前置

- 關閉所有Obsidian視窗與背景程序。
- 停用Obsidian Sync、自動更新及任務外第三方外掛，避免背景流量污染。
- 只開啟 `/Users/jugang11/Documents/Hans SafeDoc Test Vault`，不得使用真實資料。
- 記錄OS、Obsidian、Electron、Chrome、外掛版本及source commit。

## 啟動測試Host

```sh
open -na Obsidian --args \
  --remote-debugging-port=9223 \
  --log-net-log=/tmp/obsidian-chromium-netlog.json
```

確認測試Vault renderer出現在：

```sh
curl -fsS http://127.0.0.1:9223/json/list
```

## 保存真實封包

在獨立Terminal執行；測試全部完成後按`Ctrl-C`：

```sh
sudo tcpdump -i pktap,all -n -k NP \
  -B 16384 -s 256 \
  -w /tmp/obsidian-host-network.pcapng
```

capture時不得先加host filter，否則不能證明「沒有其他目的地」。
結束時 `packets dropped by kernel` 必須為 `0`；只保存PKTAP與網路標頭所需的前256 bytes，降低丟包與原始payload暴露風險。

## 文件流程：預期零連線

```sh
node scripts/record-obsidian-network-evidence.mjs \
  scan 180 /tmp/obsidian-scan-network.jsonl
```

看到`ARMED scan`後，在Obsidian依序完成合成MD／TXT／CSV的掃描、人工審核、預覽及輸出。

PASS標準：

- recorder沒有`fetch`、XHR、WebSocket、Node `http／https／net／tls`或動作相關新socket。
- Electron NetLog沒有對應外部request。
- PKTAP沒有該動作造成的outbound packet。
- 原始檔hash不變，輸出完成且檔名不含來源名稱。

### 2026-08-30 實機結果

- Obsidian 1.13.7／Electron 39.8.3／Chrome 142.0.7444.265／Hans SafeDoc 1.1.0。
- 180秒動作窗完成舊候選的合成MD／TXT／CSV掃描、批次審核、預覽與輸出；目前無模型release需重跑同流程確認零外連。
- runtime recorder網路事件0；PKTAP 70,624 packets captured、70,636 received、0 dropped。
- 動作窗內SafeDoc未建立外部request、DNS或socket。42個非loopback封包均屬動作窗前已建立的Obsidian更新、GitHub版本清單與Sync背景連線；NetLog與local port時間線可完整對應。
- 三份來源hash與mtime前後相同；新增三份匿名輸出、未覆寫，手機／Email原文殘留0。
- 受限原始證據位於本機 `/Users/jugang11/Downloads/Hans SafeDoc 驗收輸出/network-evidence-20260830-run2-pass/`，不得commit或上傳。

## D-NET-02：確認正式版沒有模型網路面

使用fresh profile執行：

```sh
node scripts/record-obsidian-network-evidence.mjs \
  scan 300 /tmp/obsidian-no-model-network.jsonl
```

看到`ARMED scan`後檢查首次設定與Help，再完成一份合成MD流程。PASS標準：

- UI沒有線上模型安裝或離線匯入入口。
- release source與bundle不含model catalog、downloader、manager、runtime或模型檔。
- SafeDoc沒有模型request、redirect、DNS、socket或runtime下載。
- 文件流程相關外連為0。

### 歷史證據（不得沿用為目前PASS）

- 在唯一合成測試Vault備份既有設定與模型後，移除 `data.json` 與 `models/`，冷啟動確認首次設定未完成、模型不存在、只啟用Hans SafeDoc且Sync停用。
- 從首次設定真實UI點擊「線上安裝小型模型」；runtime recorder完整觀察300秒，記錄6次HTTPS GET與3次TLS connect。
- 3個初始URL只指向catalog固定revision；3個redirect只符合各檔案完整allowlist prefix，未出現額外URL。
- PKTAP涵蓋完整下載、安裝與安裝後271秒，57,739 packets captured、57,750 received、0 dropped；Electron NetLog未出現額外模型request。
- `model_int8.onnx`、`vocab.txt`、`labels.txt` bytes與SHA-256全部符合catalog；沒有未知檔案或WASM／MJS／JS等runtime下載。
- 受限原始證據位於本機 `/Users/jugang11/Downloads/Hans SafeDoc 驗收輸出/network-evidence-20260830-model-install-pass/`，不得commit或上傳。
- 上述證據只適用已淘汰的模型安裝候選。D-NET-02因scope改為「無模型網路面」而重開為PENDING，必須對新build重跑。

## 結束與保存

1. 完全退出Obsidian，讓Electron NetLog flush。
2. 停止tcpdump。
3. 產生hash：

```sh
shasum -a 256 \
  /tmp/obsidian-scan-network.jsonl \
  /tmp/obsidian-scan-network.jsonl.sha256 \
  /tmp/obsidian-install-network.jsonl \
  /tmp/obsidian-install-network.jsonl.sha256 \
  /tmp/obsidian-host-network.pcapng \
  /tmp/obsidian-chromium-netlog.json
```

原始pcap與Electron NetLog可能包含環境IP、URL query或背景服務資訊：**只留在本機受限證據目錄，不得commit、上傳或附在公開Release。** 公開審查只提供去識別摘要及原始檔SHA-256。

## 判定限制

- `webRequest`同一事件只有最後註冊的listener生效，因此本runbook不動態覆寫Obsidian main-process listener。
- recorder結束時會還原所有runtime hooks；若程序被強制中止，驗收後必須重啟Obsidian。
- Obsidian背景服務流量必須用action window、PID metadata、CDP stack三者交叉判定，不得把整個app的背景連線直接歸因於Hans SafeDoc。
