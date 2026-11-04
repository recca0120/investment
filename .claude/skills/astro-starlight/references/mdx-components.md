# 在頁面中使用元件（MDX）

Starlight 會自動載入 `@astrojs/mdx`，不用另外安裝。把 `.md` 改成 `.mdx` 就能 import 元件。

## Starlight 內建元件（已驗證）

```mdx
---
title: 範例
---
import { Aside, Tabs, TabItem, Card, CardGrid, Steps, Badge, LinkCard } from '@astrojs/starlight/components';

<Aside type="caution">本頁不構成投資建議</Aside>

<Tabs>
  <TabItem label="0050">台股市值型</TabItem>
  <TabItem label="VT">全球股票</TabItem>
</Tabs>
```

- `Aside` 的 type：`note`、`tip`、`caution`、`danger`
- 純 Markdown 也可以用 `:::tip` … `:::` 語法產生 Aside，不需要改成 MDX

## 放在 Markdown 裡的自訂元件要加 `not-content`

MDX 裡的元件會被包在 `.sl-markdown-content` 裡，Starlight（以及 `site/styles/starlight.css`）的文章樣式會套用到元件內的 `table`、`h2`、`a`，造成雙重框線、格線錯位、連結變色。實際發生在首頁存摺元件上。

- 元件最外層加 `class="not-content"`
- 自訂的文章樣式寫成 `.sl-markdown-content table:not(:where(.not-content *))`，排除這些元件
- 加了 `not-content` 之後，連結顏色等要在元件裡自己設定（例如 `color: var(--sl-color-text-accent)`）

## 自訂 Astro 元件（不需要額外框架）

`site/components/Counter.astro`：

```astro
---
interface Props { start?: number }
const { start = 0 } = Astro.props;
---
<button class="counter" data-start={start}>{start}</button>
<script>
  // <script> 會自動打包；用 data-* 傳值，不要把 props 直接寫進 script
  document.querySelectorAll<HTMLButtonElement>('button.counter').forEach((b) => {
    let n = Number(b.dataset.start);
    b.addEventListener('click', () => (b.textContent = String(++n)));
  });
</script>
```

在 `docs/xxx.mdx` 中使用：

```mdx
import Counter from '@site/components/Counter.astro';

<Counter start={3} />
```

簡單的互動（切換、計算機、表單）優先用這種寫法：不需要 React，JS 很少。

## 互動元件框架（React island）

需要比較複雜的狀態管理或圖表函式庫時才加：

```bash
npx astro add react
```

```mdx
import DcaChart from '@site/components/DcaChart.tsx';

<DcaChart client:visible symbol="0050" />
```

- 一定要加 `client:*` 指令，否則只會輸出靜態 HTML、不會有互動
- `client:visible`：捲動到可見範圍時才載入，適合放在長文章中的圖表
- `client:load`：頁面載入時就啟用
- `getContainerRenderer()` 在 Astro 7 要從 `@astrojs/react/container-renderer` import（從套件根目錄 import 的寫法已棄用）

## 未來：嵌入回測結果（架構 B／C）

規劃見 `docs/decisions/0002-site-framework.md`。建議做法：

1. Python（GitHub Actions 排程）把回測結果輸出成 JSON，放到 `public/data/*.json`
2. 元件在瀏覽器端 `fetch(import.meta.env.BASE_URL + 'data/xxx.json')`。**要加上 BASE_URL**，因為網站部署在 `/investment/` 底下
3. 圖表元件用 `client:visible` 延遲載入

這部分尚未實作驗證，真正做的時候要用 build 測試，並把結果補回這份文件。
