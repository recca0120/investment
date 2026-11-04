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
  - 一個主題一個檔案，檔名用 `NN-kebab-case.md`（小寫）
  - 每篇結尾要有 `## 資料來源`，附上網址
  - 內容更新時直接改檔，不另開新版本檔
- `docs/` 底下所有 `.md` 都會發佈到網站，寫作規則：
  - 開頭一定要有 frontmatter `title`（少了網站 build 會失敗），內文從 `##` 開始，不要再寫 `# 標題`
  - `docs/knowledge/` 的文章要在 frontmatter 寫 `sidebar.order`（新手路線的站號）和 `summary`（標題下方的「重點」，1～3 點），見 `docs/decisions/0006-site-layout-route.md`
  - 需要分頁等元件時把檔案改成 `.mdx`（例如文章 07 用 Starlight 的 `<Tabs>`）
  - 文件之間用相對路徑連到 `.md`（例如 `../knowledge/01-getting-started.md`），GitHub 和網站都能點
  - `README.md` 不會發佈到網站，只給 GitHub 瀏覽資料夾用
  - 新增或修改後跑 `npm run test:site`（build ＋ 網站測試，會檢查側欄和站內連結）
- `docs/glossary/`：**新手名詞解釋**，分 6 類各一頁；每個名詞是一個 `###` 標題，固定寫「一句話、用途、例子、新手注意」
  - 知識文章裡第一次出現的名詞會自動連過去（`site/plugins/rehype-glossary-links.mjs`），名詞標題就是錨點，不要隨便改名
  - 文章用到新名詞時，順手補進名詞解釋
- `docs/log/`：**每次討論的紀錄**（原始脈絡）
  - 檔名 `YYYY-MM-DD-主題.md`，同一天多次討論加後綴
  - 記錄：使用者問了什麼、結論、待辦、產生了哪些 issue
  - 討論結束時，把可沉澱的知識同步更新到 `docs/knowledge/`
- `docs/decisions/`：**已做出的決定**（ADR 風格）
  - 檔名 `NNNN-決策標題.md`，內容：背景、選項、決定、理由
  - 對應的 decision issue 關閉時要寫一份
- `private/`：**真實持股、金額、帳戶資訊**，已在 `.gitignore`，絕不 commit
- `src/invest/`、`tests/`：Python 系統（uv 管理）
  - `uv run streamlit run src/invest/app.py`：回測器；`uv run pytest`：測試；`uv run pytest -m contract`：連網契約測試
  - 依賴組裝在 `src/invest/container.py`；資料快取在 `data/cache/`（不進 git）
  - FinMind token（選用）放 `.env` 的 `FINMIND_TOKEN`，不 commit
- 網站：Astro Starlight（見 `docs/decisions/0002-site-framework.md`），https://recca0120.github.io/investment/
  - Astro 專案在 repo 根目錄（`package.json`、`astro.config.mjs`），原始碼在 `site/`，靜態檔在 `public/`
  - 本機：`npm run dev`；測試：`npm run test:site`（build ＋ 測試）或 `npm test`（只跑測試，要先 build）
  - 網站測試在 `tests/site/`（Vitest ＋ Testing Library ＋ msw-fetch-mock），寫法見 `atdd` skill；需要 Node 22.18 以上（astro.config 會直接載入 site/design 的 .ts）
  - push 到 main 後由 `.github/workflows/site.yml` 自動部署；PR 只建置與檢查連結
  - 視覺設計見 `docs/decisions/0005-site-style-piggy-bank.md`（小豬撲滿）；樣式用 Tailwind v4（`@astrojs/starlight-tailwind`，分工見 0004）
  - 顏色、字體、圓角只改 `site/design/tokens.ts`（設計 token），build 時編譯成 Starlight、Tailwind、daisyUI 三組變數（`site/styles/generated/`，不進 git）；元件、`.mdx`、`site/styles/` 都不寫死顏色（有測試檢查，也會檢查文字對比）
  - 元件優先用 daisyUI（卡片、分頁、統計數字…），daisyUI 沒有的才自己寫；版面規則見 `docs/decisions/0006-site-layout-route.md`
  - 改網站外觀時用 `frontend-design` skill，並實際截圖檢查日間、夜間、手機（方法見 astro-starlight skill）
  - 文章 10 的情境表：`uv run python scripts/bad_luck_scenarios.py` 用真實資料重算並直接更新文章
  - 首頁撲滿與「回測的關鍵數字」：`uv run python scripts/export_passbook.py` 重新產生 `site/data/passbook.json`；「最近更新」用 git 的修改時間（CI 要 `fetch-depth: 0`）

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

- 語言：Python 3.12，套件管理用 `uv`；CI：`.github/workflows/python.yml`
- 開發流程依 `atdd` skill（repo 版，Python 系統與網站都適用）：第一個驗收測試先寫並用 check_red.py 確認紅燈；PR 前用 check_criteria.py 確認每條驗收條件都有測試
- 資料來源：FinMind（台股自己用原始價＋股利＋分割計算還原價；美股用 Adj_Close），yfinance 只做交叉驗證（見 `docs/decisions/0003-data-source.md`）

## 專案 Skills

- 位置：`.claude/skills/`（跟著 repo 版控，只在本專案生效）
- `astro-starlight`：Astro 7 ＋ Starlight 建站、設定、部署；動到網站相關檔案前先讀
- `atdd`：第一個驗收測試先寫（設計 API）＋確認紅燈、每條驗收條件都要有測試；pytest 與 Vitest 都適用；附 3 個檢查 script（new_feature／check_red／check_criteria）；寫任何程式（含網站）前先讀
- 共用 skill `atdd-principles`（`~/.claude/skills/`）是通用原則；和 repo 版衝突時以 repo 版為準
- 新增或修改 skill 時用內建的 `skill-creator`；技術類 skill 要先上網查最新版並實測驗證

## 待整理

- 本檔案之後會逐步拆成 memory 與 skill，拆出去的規則要從這裡刪除，避免重複
