---
name: astro-starlight
description: Astro 7 ＋ Starlight 0.42 文件網站指南（2026-11 實測驗證）。用 Starlight 建立或修改文件網站、設定 astro.config／content.config、側欄、繁體中文介面、把 repo 的 docs/ 當內容來源、處理 .md 相對連結、部署到 GitHub Pages、在 MDX 嵌入元件或互動圖表、用 Tailwind 調整網站樣式時，一定要先讀這個 skill。只要使用者提到「網站」「Starlight」「Astro」「GitHub Pages」「把 docs 發佈出去」「網站側欄／搜尋／中文」，或要改 site/、astro.config.mjs、.github/workflows/deploy.yml，即使沒有明講 Starlight 也要使用。不適用於 Python 投資系統（Streamlit）本身。
---

# Astro 7 ＋ Starlight 文件網站

這份 skill 的內容是在 2026-11-03 用真實專案 build 驗證過的。Astro 與 Starlight 改版很快，訓練資料裡的寫法（Astro 4～6、Starlight 0.3x）有不少已經失效，所以以這裡為準；若遇到這裡沒寫到的問題，先查官方文件，不要憑記憶寫。

## 已驗證的版本

| 套件 | 版本 | 備註 |
|---|---|---|
| `astro` | 7.4.5 | 需要 Node `>=22.23.4`；底層 Vite 8、Rust compiler |
| `@astrojs/starlight` | 0.42.8 | peer：`astro ^7.2.10` |
| `@astrojs/markdown-remark` | 7.x | 只有要用 remark／rehype plugin 時才裝 |
| `withastro/action` | v6 | 預設 Node 24 |
| `actions/checkout` | v7 | |
| `actions/deploy-pages` | v5 | |

開始前用 `npm view <pkg> version` 確認是否又有新版；若主版號變了，先讀該版的 upgrade guide。

## 本 repo 的目錄配置（為什麼這樣放）

```
investment/
├── package.json          ← Astro 專案在 repo 根目錄
├── astro.config.mjs      ← srcDir: './site'
├── tsconfig.json         ← paths: "@site/*" → "./site/*"
├── site/                 ← Astro 原始碼（取代預設的 src/）
│   ├── content.config.ts
│   ├── components/
│   └── plugins/rehype-md-links.mjs
├── docs/                 ← 內容（knowledge/、log/、decisions/），GitHub 上也能直接讀
└── src/                  ← 留給 Python 投資系統
```

這樣配置的理由，都是實測踩過的：

- **Astro 專案必須在 repo 根目錄，不能放在 `site/` 子目錄當獨立專案**：如果內容 `docs/` 在 Astro 專案目錄外面，MDX 檔的 `import`（例如 `@astrojs/starlight/components`）會因為往上找不到 `node_modules` 而 build 失敗（`Rolldown failed to resolve import`）
- **用 `srcDir: './site'`**：把 Astro 原始碼和 Python 的 `src/` 分開
- **內容留在 `docs/`，不搬進 `src/content/docs/`**：`docs/` 同時是 GitHub 上可閱讀的筆記，也是網站來源，只維護一份

`.gitignore` 若有 `site/`（MkDocs 的輸出目錄慣例），建站時要移除，否則原始碼不會被 commit。

## 驗證要看「畫面」，不是只看 build 和 HTTP 200

這份 skill 第一版只驗證了 build 成功、連結正確、HTTP 200，結果上線後側欄整個是空的（2026-11-03 實際發生）。建站或改設定後：

1. `npm run test:site`：build 後跑網站測試（側欄、連結、元件、手機版面），寫法見 `atdd` skill 的 `references/vitest-site.md`
2. **實際截圖看畫面**。沒有瀏覽器擴充功能時可以用 headless Chrome：
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
     --window-size=1400,1000 --virtual-time-budget=5000 --screenshot=out.png "https://recca0120.github.io/investment/knowledge/01-getting-started/"
   ```
   檢查：側欄有文章、首頁、文章頁
3. **手機版不要用 `--window-size=390,...`**：headless Chrome 有最小視窗寬度，截出來會像是內容被切掉（實際踩過的假象）。改用 Playwright 的裝置模擬，搭配本機 Chrome，不用另外下載瀏覽器：
   ```python
   # uv run --with playwright python check.py
   from playwright.sync_api import sync_playwright
   with sync_playwright() as p:
       b = p.chromium.launch(channel="chrome")
       pg = b.new_context(**p.devices["iPhone 13"]).new_page()
       pg.goto(URL, wait_until="networkidle")
       assert pg.evaluate("document.documentElement.scrollWidth <= innerWidth")  # 沒有水平溢出（已寫成 Browser Mode 測試：tests/site/browser/）
       pg.screenshot(path="mobile.png")
   ```

## 建站步驟

1. 安裝：`npm i astro @astrojs/starlight sharp`，需要相對連結改寫時再加 `@astrojs/markdown-remark unist-util-visit`
2. 依 `references/config.md` 建立 `astro.config.mjs`、`site/content.config.ts`、`tsconfig.json`、`package.json` scripts
3. 把 `assets/rehype-md-links.mjs` 複製到 `site/plugins/`
4. 每篇 `docs/**/*.md` 加上 frontmatter `title`（見下方「內容規則」）
5. 建立 `public/favicon.svg`
6. `npm run test:site` 確認沒有錯誤與壞連結，`npm run dev` 本機檢查
7. 依 `references/deploy-github-pages.md` 加 workflow，並在 repo 設定 Pages source = GitHub Actions

## 內容規則（寫 docs/ 時要遵守）

- **每個 `.md`／`.mdx` 都要有 frontmatter `title`**，少了就整個 build 失敗（`title: Required`）
  ```markdown
  ---
  title: 新手入門路線
  description: 一句話摘要（選填，會用在 SEO 與搜尋結果）
  ---
  ```
- **不要再寫 `# 標題`**：Starlight 會把 `title` 渲染成 H1，內文再寫一次會出現兩個標題；內文從 `##` 開始
- **檔名以 `_` 開頭的不會被載入**（loader pattern 是 `**/[^_]*.{md,mdx}`），可以拿來放草稿
- **`README.md` 不會被載入**（pattern 加了 `'!**/README.md'`），它們是給 GitHub 瀏覽資料夾用的索引
- **相對連結照常寫 `.md`**，例如 `[入門](../knowledge/01-getting-started.md)`：GitHub 上可以點，網站上由 `rehype-md-links` 轉成 `/investment/knowledge/01-getting-started/`。沒有這個 plugin 的話，Starlight 會原樣輸出 `.md` 連結，網站上會 404
- **網址 slug 會轉成小寫**，檔名建議一律用小寫 kebab-case
- 要用元件時才把副檔名改成 `.mdx`；純文章維持 `.md`

## Astro 7／Starlight 0.4x 常見陷阱

| 症狀 | 原因 | 解法 |
|---|---|---|
| `Found an autogenerate object with a label` | Starlight 0.39 移除了自動產生的側欄群組寫法 | 改成 `{ label: '知識', items: [{ autogenerate: { directory: 'knowledge' } }] }` |
| `markdown.rehypePlugins` 沒效果或報錯 | Astro 7 預設 Markdown 處理器改成 Sätteri，不再內建 remark／rehype | 安裝 `@astrojs/markdown-remark`，用 `markdown: { processor: unified({ rehypePlugins: [...] }) }` |
| 相鄰的行內元素之間空白不見了 | Astro 7 的 `compressHTML` 預設改為 `'jsx'` | 寫 `{" "}`，或設定 `compressHTML: true` 回到舊行為 |
| 未關閉的 HTML 標籤造成 build 錯誤 | Rust compiler 對 HTML 更嚴格，也不再自動修正錯誤的巢狀結構 | 修正 HTML；不要在 `<p>` 裡放 `<div>` |
| `docsLoader()` 讀不到 `docs/` | `docsLoader()` 的路徑寫死在 `src/content/docs` | 改用 `glob({ pattern, base: './docs' })` ＋ `docsSchema()` |
| **側欄分組是空的**，但 build 成功、頁面也都在 | autogenerate 用 `entry.filePath` 去掉寫死的 `<srcDir>/content/docs/` 前綴後比對目錄；內容在 `docs/` 時前綴去不掉 | `directory` 寫 `'docs/knowledge'`（相對專案根目錄），不要寫 `'knowledge'`。`tests/site/acceptance/sidebar.test.ts` 會檢查每篇文章都在側欄 |
| `:::tip` 被輸出成普通 `<div>`、標題沒有錨點連結 | Starlight 的 Markdown 轉換只套用在 `src/content/docs` 底下的檔案 | 在 `starlight({ markdown: { processedDirs: ['./docs'] } })` 加上內容目錄 |
| 改了設定，輸出結果卻沒變 | content layer 會快取渲染結果 | `rm -rf .astro node_modules/.astro dist` 後再 build |
| `The collection "i18n" does not exist` 警告 | 沒有定義 i18n collection | 無害，可忽略；需要自訂 UI 翻譯時再加 |
| 每頁都 404 `/investment/favicon.svg` | Starlight 預設引用 `public/favicon.svg`，但手動建站時沒有這個檔 | 建立 `public/favicon.svg`（`public/` 在專案根目錄，不受 `srcDir` 影響） |
| `src/fetch.ts` 行為怪異 | Astro 7 把它保留給 advanced routing | 不要用這個檔名 |

## 什麼時候讀哪份參考

- `references/config.md`：完整的設定檔範例（astro.config、content.config、tsconfig、package.json），開始建站或改設定時讀
- `references/deploy-github-pages.md`：GitHub Actions workflow 與 Pages 設定，要部署或部署出錯時讀
- `references/tailwind.md`：Tailwind v4 與 Starlight 的圖層、日夜模式 token、MDX 的 `<p>` 陷阱，要改樣式時讀
- `references/topics-and-overrides.md`：網站分區（starlight-sidebar-topics）、覆寫 Header／Sidebar、外掛遇到 base 的 bug、daisyUI 元件的結構陷阱，要改導覽或側欄時讀
- `references/mdx-components.md`：Starlight 內建元件、自訂 Astro 元件、互動元件（React island）、未來嵌入回測圖表的做法，要在頁面放元件時讀
- `assets/rehype-md-links.mjs`：已測試過的相對連結改寫 plugin，直接複製使用

## 資料來源

- [Astro v7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/)
- [Deploy Astro to GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
- [Starlight Getting Started](https://starlight.astro.build/getting-started/)
- [Starlight Configuration Reference](https://starlight.astro.build/reference/configuration/)
- 實測：`@astrojs/starlight@0.42.8` 原始碼 `dist/loaders.js`、`dist/index.js`
