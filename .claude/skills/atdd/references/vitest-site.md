# 網站測試：Vitest ＋ Testing Library ＋ msw-fetch-mock

2026-11-03 實測：vitest 5.1.0、@vitest/browser-playwright 5.1.0、@testing-library/dom 10.4.2、@testing-library/jest-dom 7.0.1、happy-dom 21.0.4、msw 3.0.3、msw-fetch-mock 0.7.1、Astro 7.4.5、Starlight 0.42.8。

## 目錄與分層

```
vitest.config.ts              兩個 project：node、browser
tests/site/
  support/                    共用工具＋環境本身的測試
    setup.ts                  jest-dom matcher；msw-fetch-mock 擋掉所有沒設定的 HTTP
    dist.ts                   openPage()、allPages()、existsInDist()：讀 dist/ 的 HTML
    render.ts                 render()：Astro 元件 → HTML → Testing Library
    serve-dist.ts             Browser Mode 的 vite plugin：在 /investment/ 提供 dist/
  acceptance/                 驗收（主幹）：讀 build 好的 dist/ HTML
  components/                 元件：Container API，用 props 傳資料
  plugins/                    rehype 外掛：unified 直接跑
  browser/                    真實瀏覽器：版面（手機寬度不能水平捲動）
```

| 層 | 打在哪裡 | 什麼時候寫 | 抓得到的例子 |
|---|---|---|---|
| 驗收 | `openPage('knowledge/01-…/')` 讀 `dist/` | 使用者看得到的結構：側欄、首頁、連結。**網站功能的第一個驗收測試寫在這層** | 側欄是空的（autogenerate 目錄寫錯） |
| 元件 | `render(Component, { props })` | 元件有資料轉換、排序、條件顯示時 | 存摺最後一列算錯、排序錯 |
| 外掛 | `unified().use(plugin)` | 改寫 Markdown 輸出的規則 | 代號欄一半靠右 |
| 瀏覽器 | iframe 打開 `/investment/…` | 版面、CSS、需要執行 JS 的互動 | 表格撐破手機畫面 |
| HTTP | `fetchMock.get(origin).intercept({ path }).reply()` | 瀏覽器端抓資料的程式（架構 C） | API 失敗時的畫面 |

指令：`npm run test:site`（build ＋ 全部測試）、`npm test`（只跑測試，dist 要是新的）、`npx vitest run --project node`、`npx vitest --project browser`。

## 驗收條件標記

測試名稱以 `[#<issue>-<序號>]` 開頭，`check_criteria.py` 會掃描：

```ts
test('[#15-1] 文章頁的側欄列出每一篇文章', () => { … });
test.each(pages)('[#15-7] $name 沒有水平捲動', async ({ path }) => { … });
test.todo('[#15-3] …');   // 還沒寫，不算數
```

`check_red.py` 的目標寫 `檔案::完整名稱`，describe 和 test 名稱用 ` > ` 連接（和報告顯示的一樣）：

```bash
python3 .claude/skills/atdd/scripts/check_red.py "tests/site/acceptance/sidebar.test.ts::側欄 > [#15-1] 文章頁的側欄列出每一篇文章，目前頁面標示為 aria-current"
```

正確的紅燈：`AssertionError`（expect）、`TestingLibraryElementError`（畫面上還沒有這個元素）、`NotImplementedError`（自己定義的 class，`name = 'NotImplementedError'`）。`TypeError`、import 失敗、`test.todo`、直接通過都不算。

## 已經存在的行為：故意弄壞一次

為既有功能補測試時（例如這次的側欄、連結檢查），測試一寫就是綠的，沒有紅燈可以確認。改成**故意把程式弄壞一次**，確認測試會失敗、而且失敗訊息指出問題，再改回來：

```bash
sed -i '' "s#directory: 'docs/knowledge'#directory: 'knowledge'#" astro.config.mjs   # 重現側欄 bug
npm run build && python3 .claude/skills/atdd/scripts/check_red.py "tests/site/acceptance/sidebar.test.ts::…"
git checkout astro.config.mjs && npm run build
```

**弄壞時注意 build 有沒有成功**：用 `npm run build && npx vitest …` 串起來時，改壞的程式如果讓 build 失敗（例如在 script 頂層寫 `return`），後面的測試根本沒跑，輸出是空的，很容易誤以為「測試沒抓到」或「測試過了」。#19 實際踩過。

#15 實際做過的：側欄目錄改錯、文章加一個壞連結、外掛拿掉錨點、表格加 `min-width: 600px`、關掉 msw-fetch-mock，五個都讓對應測試失敗。**弄壞後要重新 build**，驗收和瀏覽器測試讀的是 `dist/`。

## 驗收測試：讀 dist/

```ts
import { within } from '@testing-library/dom';
import { openPage } from '../support/dist';

test('[#15-1] …', () => {
  const { screen } = openPage('knowledge/01-getting-started/');
  const nav = within(screen.getByRole('navigation', { name: '主要' }));   // Starlight 側欄的 aria-label
  expect(nav.getByRole('link', { name: '新手入門路線' })).toHaveAttribute('aria-current', 'page');
});
```

- 預期值盡量從來源推導（例如從 `docs/` 讀 frontmatter title），新增文章時不用改測試
- 用 `getByRole` 加可及名稱查詢；查不到時 Testing Library 會列出頁面上所有的 role，很好除錯
- 用 happy-dom 的 `new Window({ url })` ＋ `document.write()` 解析，不執行頁面的 script

## 元件測試：用 props 傳資料

Vitest 裡有兩個 Astro 功能不能用，**實測確認，改設定也沒用**：

- `import.meta.env.BASE_URL` 固定是 `/`（`getViteConfig` 帶 base、Container 的 `astroConfig.base` 都沒效）
- `getCollection()` 回傳空陣列（先跑 `astro sync` 也一樣）

所以元件的 base 和資料要能從 props 傳入，預設值才讀 env／collection：

```astro
---
interface Props { docs?: Doc[]; base?: string }
const docs = Astro.props.docs ?? (await getCollection('docs')).map(…);
const base = (Astro.props.base ?? import.meta.env.BASE_URL).replace(/\/$/, '');
---
```

```ts
const screen = await render(ReadingOrder, { props: { docs, base: '/investment/' } });
```

- 測試資料手寫小樣本，預期值能直接對照；真實資料是否接上，由驗收測試（讀 dist）確認
- **不能**把 node project 的 `environment` 設成 `happy-dom`：Container API 會丟 `NoMatchingRenderer`。`render()` 是在 Node 環境渲染成字串，再放進 happy-dom 的 `Window`
- Container API 仍是實驗性功能（`experimental_AstroContainer`），升級 Astro 時注意

## 瀏覽器測試：Vitest Browser Mode

```ts
// vitest.config.ts 的 browser project
plugins: [serveDist()],   // /investment/* → dist/*，測試頁才能用同源 iframe 讀版面
test: {
  browser: {
    enabled: true,
    headless: true,
    provider: playwright({ launchOptions: { channel: 'chrome' } }),  // 用已安裝的 Chrome，不下載
    instances: [{ browser: 'chromium' }],
  },
},
```

- 用 iframe 設定寬高（375×812）打開頁面，iframe 裡的 media query 依 iframe 寬度生效
- 檢查 `doc.documentElement.scrollWidth <= clientWidth`；失敗訊息寫出實際寬度
- 頁面清單用 `import.meta.glob('/docs/knowledge/[0-9]*.md')` 產生，新增文章自動納入
- GitHub Actions 的 ubuntu runner 已安裝 Google Chrome，`channel: 'chrome'` 可以直接用
- 截圖人工檢查（日間、夜間、手機）仍然要做：測試只檢查寫得出條件的東西

### 動畫與「減少動態效果」

在 `vitest.config.ts` 的 browser 設定加自訂 command，用 Playwright 模擬作業系統設定，iframe 裡的頁面也會套用：

```ts
commands: {
  setReducedMotion: async (ctx, reduce: boolean) => {
    await ctx.page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
  },
},
```

```ts
import { commands } from 'vitest/browser';
afterEach(() => commands.setReducedMotion(false));   // 一定要還原，否則影響後面的測試
```

- **不要等 iframe 的 load 再檢查動畫的起始狀態**：平行跑測試時，外部字型樣式表會拖慢 load，動畫早就播完了（#19 實際遇到：單獨跑會過，全部一起跑就失敗）。改成元素一出現就用 `MutationObserver` 記錄每一次變化，最後檢查「經過了哪些值」
- 檢查動畫有沒有套用：`getComputedStyle(el).animationName`；iframe 裡的元素要用 `el.ownerDocument.defaultView.getComputedStyle`

## HTTP：msw-fetch-mock

`setup.ts` 對所有 node 測試啟用，**沒設定的請求一律失敗**（相當於 Python 端的 pytest-socket）：

```ts
beforeAll(() => fetchMock.activate({ onUnhandledRequest: 'error' }));
afterEach(() => { fetchMock.assertNoPendingInterceptors(); fetchMock.reset(); });
afterAll(() => fetchMock.deactivate());
```

```ts
fetchMock.get('https://recca0120.github.io')
  .intercept({ path: '/investment/data/0050.json' })
  .reply(200, { final: 3074574 });
```

- `assertNoPendingInterceptors()`：設定了卻沒被呼叫的攔截會讓測試失敗，避免測錯網址卻沒發現
- msw v3 需要 Node 22.12 以上（`package.json` 的 `engines` 已限制）
- 之後在 Browser Mode 測瀏覽器端 fetch 時：import `msw-fetch-mock/browser`，先 `npx msw init public` 產生 worker 檔，`afterAll` 寫 `await fetchMock.deactivate()`

## 資料來源

- [Astro：Testing（Vitest、Container API）](https://docs.astro.build/en/guides/testing/)
- [Vitest：Browser Mode](https://vitest.dev/guide/browser/)
- [Testing Library：ByRole](https://testing-library.com/docs/queries/byrole/)
- [msw-fetch-mock：升級到 0.7](https://github.com/recca0120/msw-fetch-mock/blob/main/docs/upgrade-0.7.zh-TW.md)
