# Engineer Handoff Prompt

將整個規格套件放入 Repository 根目錄後，把以下指令交給工程師或 AI Coding Agent：

> 你正在開發 Privacy Bridge v1.0。請先讀 `docs/MASTER-SPEC.md`、`docs/ENGINEER-EXECUTION-PROTOCOL.md`、`docs/IMPLEMENTATION-PLAN.md`、`docs/ACCEPTANCE-MATRIX.md` 與 `schemas/`。  
>   
> 依 E00 → E16 的相依順序持續實作，不得把 `reference/legacy-seed` 當作規格來源。每個 Task 先新增 failing test，再實作，並在 PR 中標記 Requirement ID、Acceptance ID 與 Test。  
>   
> 不要向 Product Owner 詢問一般產品、UI 或技術細節。規格沒有直接描述時，依「不外洩、不毀損、不錯誤還原、可稽核、相容」的順序採用最安全預設，並寫 ADR。新功能放入 v1.1 backlog，不擴張 v1。  
>   
> 只有 STOP-01 至 STOP-04 能阻擋 Release；即使發生，也要繼續所有不受影響的工作。  
>   
> 現在從 E00 Repository and CI 開始。每完成一項，自動選擇下一個 dependency-ready task，不等待額外指示，直到 Gate D 全部通過並產生 GitHub Alpha release artifacts。

## Handoff 驗證

工程師收到後第一個回覆只能包含：

```text
Spec validation result
Schema count
Acceptance count
Legacy seed status
Selected first task
Open STOP blockers
```

不得先提出產品問題。
