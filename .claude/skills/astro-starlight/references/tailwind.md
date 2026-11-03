# Starlight ＋ Tailwind CSS v4

2026-11-03 實測：tailwindcss 4.3.4、@tailwindcss/vite 4.3.4、@astrojs/starlight-tailwind 5.0.0、Starlight 0.42.8、Astro 7.4.5（#17）。通用的 Tailwind 寫法見使用者的 `tailwind` skill，這份只記和 Starlight 搭配時的做法與陷阱。

## 設定

```bash
npm i tailwindcss @tailwindcss/vite @astrojs/starlight-tailwind
```

```js
// astro.config.mjs
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  vite: { plugins: [tailwindcss()] },
  integrations: [starlight({ customCss: ['./site/styles/global.css'] })],
});
```

```css
/* site/styles/global.css */
@layer base, starlight, theme, components, utilities;

@import '@astrojs/starlight-tailwind';
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
@import './theme.css';
```

- **不載入 preflight**（`tailwindcss/preflight.css`）：Starlight 有自己的 reset。`starlight-tailwind` 只補回 `* { border: 0 solid }`，所以 `border border-rule` 這種 utility 可以直接用
- 圖層順序：`base < starlight < theme < components < utilities`，**沒有放進圖層的規則最優先**
- `starlight-tailwind` 在 utilities 圖層把 `--sl-color-*` 設成 Tailwind 的灰階（`--color-gray-200` 等）與 accent 色階，而且日夜模式用固定的色階對應（夜間 gray-1 ＝ gray-200、日間 gray-1 ＝ gray-800）。既有配色不是對稱色階時無法完全對上，所以本 repo 的 `--sl-color-*` 寫在 `theme.css` **不放進圖層**，蓋過它的對應
- Starlight 頁面樣式的調整（文章表格、側欄）放進 `@layer components`：蓋過 `starlight` 圖層，又能被 utility 覆寫

## 會隨日夜模式變化的 token：`@theme inline`

```css
@theme inline {
  --color-paper: var(--pb-paper);   /* --pb-paper 在 theme.css 依 data-theme 各定義一次 */
  --color-muted: var(--sl-color-gray-3);
}
```

`inline` 讓 utility 直接輸出 `background-color: var(--pb-paper)`，切換日夜模式時跟著變。不加 `inline` 的話，值會在 `:root` 被解析一次，夜間模式不會更新。

字級沿用 Starlight 的尺度，全站只有一套：

```css
@theme inline {
  --text-sm: var(--sl-text-sm);
  --text-sm--line-height: inherit;   /* Tailwind 的 text-* 會一起設定行高，這裡改成繼承內文的 1.8 */
}
```

## 實際踩過的陷阱

| 症狀 | 原因 | 解法 |
|---|---|---|
| MDX 裡 `<p class="text-lg">` 沒效果，文字還是預設大小 | 開頭標籤後換行的話，MDX 把內文當成 Markdown 段落，在裡面**再包一層 `<p>`**，class 套在外層的空 `<p>` 上。原本用 `.home-intro p` 這種後代選擇器時剛好兩層都套到，沒發現 | 內文和 `<p>` 寫在同一行；或把樣式放在外層 `<div>` |
| `-rotate-8` 加上動畫後角度變兩倍或消失 | Tailwind v4 的 `rotate-*`、`scale-*`、`translate-*` 用獨立的 CSS 屬性（`rotate:`、`scale:`），keyframes 若動 `transform` 會疊加上去 | keyframes 只動 `scale`、`opacity`，角度交給 utility |
| 中文句子在奇怪的地方斷行（「撲／滿」） | 中文每個字之間都可以斷行，`text-balance` 也救不了 | 把每個子句包成 `inline-block`，只會在子句之間換行 |
| SVG 裡用 CSS 動畫移動 `<g>`，位置跑掉 | CSS 的 `transform` 會蓋掉 SVG 的 `transform` 屬性 | 動畫的元素不要用 `transform` 屬性定位，直接寫 `cx`／`cy` |
| 2.4rem 換成 utility 後有些微差異 | spacing 以 0.25rem 為單位（`h-9.5` ＝ 2.375rem） | 差 1px 就近取（token-first），不要寫 `h-[2.4rem]` |

## 驗證

- 只換工具不改外觀時：改之前先截圖（日間、夜間、桌面、手機），改完再截一次逐像素比對，找出差異的位置再看
- 自動化：`tests/site/browser/theme.test.ts`（日夜模式的 computed color）、`passbook-style.test.ts`（utility 在瀏覽器生效）、`acceptance/no-hardcoded-colors.test.ts`（元件不寫死顏色）

## 資料來源

- [Starlight：CSS & Tailwind](https://starlight.astro.build/guides/css-and-tailwind/)
- [Tailwind CSS：Theme variables（`@theme inline`）](https://tailwindcss.com/docs/theme)
