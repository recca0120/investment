# CLAUDE.md

本 repo 是使用者（股市新手）與 Claude 一起學習投資、整理知識、開發投資輔助系統的地方。

## 基本資訊

- GitHub repo：`recca0120/investment`（public）
- 本機路徑：`/Users/recca0120/PycharmProjects/investment`
- 使用者背景：股市新手、會寫程式（Python）、以台灣市場為主
- 溝通語言：繁體中文；技術名詞與程式識別字保留原文

## GitHub 帳號規則（重要）

- 本機 `gh` 預設 active 帳號不是 recca0120，**所有 `gh` 指令都要指定帳號**：
  - `GH_TOKEN=$(gh auth token -u recca0120) gh <command>`
- 不要執行 `gh auth switch`（會影響使用者其他專案）
- `git push` 走 SSH，已是 recca0120 身分，可直接使用
- GitHub Projects（board）需要 `project` scope；若權限不足，請使用者執行：
  - `! gh auth switch -u recca0120 && gh auth refresh -h github.com -s project,read:project`
  - `gh auth refresh` 沒有 `-u` 參數，只能對 active 帳號操作，所以要先 switch
  - 完成後提醒使用者自行切回原本的帳號；不要在 repo 中寫出其他帳號名稱

## 內容放置規則：什麼東西放哪裡

- `docs/knowledge/`：**整理過的知識**（定稿內容），未來網站的主要來源
  - 一個主題一個檔案，檔名用 `NN-kebab-case.md`
  - 每篇結尾要有 `## 資料來源`，附上網址
  - 內容更新時直接改檔，不另開新版本檔
- `docs/log/`：**每次討論的紀錄**（原始脈絡）
  - 檔名 `YYYY-MM-DD-主題.md`，同一天多次討論加後綴
  - 記錄：使用者問了什麼、結論、待辦、產生了哪些 issue
  - 討論結束時，把可沉澱的知識同步更新到 `docs/knowledge/`
- `docs/decisions/`：**已做出的決定**（ADR 風格）
  - 檔名 `NNNN-決策標題.md`，內容：背景、選項、決定、理由
  - 對應的 decision issue 關閉時要寫一份
- `private/`：**真實持股、金額、帳戶資訊**，已在 `.gitignore`，絕不 commit
- `src/`、`tests/`：系統程式碼（尚未建立，等第一個開發 issue 開始時再建）
- 網站：Astro Starlight，先走「網站與系統分開」架構（見 `docs/decisions/0002-site-framework.md`），網站專案目錄待建立網站時決定

## Issue 規則

- 可執行或待決定的事項才開 issue；純知識放 `docs/`
- 標題格式：`[類型] 簡述`，例如 `[決策] 網站框架選擇`
- 每個 issue 至少要有一個 `type:*` 和一個 `area:*` label
- Labels：
  - `type:decision`：需要使用者做決定
  - `type:research`：需要上網查資料、整理比較
  - `type:feature`：系統功能開發
  - `type:bug`：程式錯誤
  - `type:docs`：文件／知識整理
  - `area:knowledge`：投資知識
  - `area:system`：投資輔助系統（程式）
  - `area:site`：知識網站
  - `area:repo`：repo 本身的設定與流程
- 使用 `.github/ISSUE_TEMPLATE/` 裡的範本
- 研究型 issue 完成後：結果寫進 `docs/knowledge/`，在 issue 留下連結再關閉
- 決策型 issue 完成後：寫 `docs/decisions/`，在 issue 留下連結再關閉

## Wiki / Discussions

- 目前**不使用** Wiki：知識統一放 `docs/`（single source of truth），避免兩邊不同步
- 目前**不使用** Discussions：開放式討論直接在對話中進行，結果記錄到 `docs/log/`
- 若之後要啟用，先開 `[決策]` issue 討論

## Project Board

- 用一個 GitHub Project（名稱：`Investment`，編號 `3`，https://github.com/users/recca0120/projects/3）管理所有 issue
- 加入 board：`gh project item-add 3 --owner recca0120 --url <issue網址>`，再用 `gh project item-edit` 設定 Status
- 欄位：`Backlog` → `Todo` → `In Progress` → `Done`
- 新開的 issue 一律加入 board，預設放 `Backlog`

## Git 規則

- 預設分支：`main`
- 文件類修改（`docs/`、`README.md`、`CLAUDE.md`）可以直接 commit 到 `main`
- 程式開發：開 branch `feat/<issue號>-簡述` 或 `fix/<issue號>-簡述`，用 PR 合併，PR 內文寫 `Closes #<issue號>`
- Commit message：Conventional Commits，描述用繁體中文
  - 例：`docs: 新增投資商品比較`、`feat: 定期定額回測器 MVP (#3)`
- commit／push 前先跟使用者確認，除非使用者已明確說可以直接做

## 投資內容規則

- 所有內容都是學習筆記，不構成投資建議；給建議時要講清楚前提與風險
- 網路查到的資料要附來源網址，並標註資料日期；稅率、費率等數字要提醒以官方最新規定為準
- 優先提供多種方案並比較優缺點，而不是只給單一答案
- 不在 repo 中寫入使用者真實持股、金額、帳號

## 系統開發規則（之後會補充）

- 語言：Python，套件管理用 `uv`
- 開發流程依 `atdd` skill（repo 版）：先從 issue 的 Given/When/Then 寫驗收測試，紅燈原因要正確
- 資料來源候選：證交所 OpenAPI、FinMind、yfinance（待 research issue 評估）

## 專案 Skills

- 位置：`.claude/skills/`（跟著 repo 版控，只在本專案生效）
- `astro-starlight`：Astro 7 ＋ Starlight 建站、設定、部署；動到網站相關檔案前先讀
- `atdd`：第一個驗收測試先寫（設計 API）＋確認紅燈、每條驗收條件都要有測試；附 3 個檢查 script（new_feature／check_red／check_criteria）；寫任何程式前先讀
- 共用 skill `atdd-principles`（`~/.claude/skills/`）是通用原則；和 repo 版衝突時以 repo 版為準
- 新增或修改 skill 時用內建的 `skill-creator`；技術類 skill 要先上網查最新版並實測驗證

## 待整理

- 本檔案之後會逐步拆成 memory 與 skill，拆出去的規則要從這裡刪除，避免重複
