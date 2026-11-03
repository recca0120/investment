# 部署到 GitHub Pages

## 一次性設定

1. Repo 必須是 public（GitHub Free 的私人 repo 不能用 Pages）
2. Settings → Pages → Build and deployment → Source 選 **GitHub Actions**
   - 也可以用 CLI：`gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`（已存在時改用 `-X PUT`）
3. `astro.config.mjs` 設定 `site: 'https://<user>.github.io'` 與 `base: '/<repo>'`

## .github/workflows/deploy.yml

```yaml
name: Deploy site to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'site/**'
      - 'astro.config.mjs'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: withastro/action@v6
        # Astro 專案在 repo 根目錄，不需要 path
        # with:
        #   node-version: 24

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

### 設計說明

- `paths` 過濾：只改 Python 系統（`src/`）時不會觸發部署
- `concurrency`：避免兩次部署互相覆蓋；`cancel-in-progress: false` 讓正在進行的部署跑完
- 版本是 2026-11-03 查 GitHub releases 的最新版：`withastro/action v6.1.4`、`actions/checkout v7.0.1`、`actions/deploy-pages v5.0.1`

## 本 repo 實際採用的版本：部署前跑網站測試

`withastro/action` 把安裝、建置、上傳包在一起，中間沒辦法插入測試。本 repo 的 `.github/workflows/site.yml` 改成自己寫各個步驟：

- `actions/setup-node@v7`（Node 24、npm cache）→ `npm ci` → `npm run build`
- `npm test`：Vitest 網站測試（讀 `dist/` 的驗收測試、元件、外掛、Browser Mode 手機版面）。Browser Mode 用 runner 內建的 Google Chrome（`channel: 'chrome'`），不用 `npx playwright install`
- `actions/upload-pages-artifact@v5`（`path: dist`）→ `actions/deploy-pages@v5`
- PR 只跑建置和測試，不部署；push 到 main 才部署
- 沒有使用 YAML anchor，路徑清單在 push 和 pull_request 各寫一次（保守做法）

## 部署後驗證

```bash
gh run list --workflow site.yml --limit 1   # 本 repo 的 workflow 檔名
gh run watch <run-id>
curl -sI https://recca0120.github.io/investment/ | head -1
```

## 常見問題

| 症狀 | 原因 |
|---|---|
| 頁面有內容但 CSS 跑掉 | `base` 沒設，或和 repo 名稱不一致 |
| 首頁正常，內頁連結 404 | 內文用了 `/xxx` 絕對路徑而沒加 base；或 `.md` 連結沒被改寫 |
| deploy job 出現 `Get Pages site failed` | Pages source 還沒設成 GitHub Actions |
| `npm ci` 失敗 | 沒有 commit `package-lock.json` |
