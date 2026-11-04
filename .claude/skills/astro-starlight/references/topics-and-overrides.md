# 網站分區（starlight-sidebar-topics）與元件覆寫

2026-11-04 實測：starlight-sidebar-topics 0.9.0、Starlight 0.42.8、daisyUI 5.7.50（#22）。

## 分區設定

```js
// astro.config.mjs
import starlightSidebarTopics from 'starlight-sidebar-topics';

starlight({
  // 不能再寫頂層的 sidebar，外掛會直接報錯；側欄改寫在每個分區的 items
  plugins: [
    starlightSidebarTopics(
      [
        { id: 'knowledge', label: '投資知識', link: '/knowledge/01-getting-started/',
          items: [{ autogenerate: { directory: 'docs/knowledge' } }] },
        // …
      ],
      { exclude: ['/'] },   // 首頁不屬於任何分區（沒寫的話 build 會失敗：Failed to find the topic）
    ),
  ],
  routeMiddleware: './site/route-middleware.ts',
  components: { Header: './site/components/starlight/Header.astro', Sidebar: './site/components/starlight/Sidebar.astro' },
});
```

- **`link` 不含 base**：外掛會自己加上 `/investment`。寫成 `${base}/knowledge/…` 會變成 `/investment/investment/…`（連結檢查測試抓到過）
- 分區資料：`Astro.locals.starlightSidebarTopics`（`isPageWithTopic`、`topics[]`：`label`、`link`、`isCurrent`）
- 自己覆寫 `Sidebar` 時，外掛就不會塞它的分區清單（使用者的 `components` 優先）

## 外掛的 bug：有 base 時「上一篇／下一篇」會跨區

外掛在每區第一篇／最後一篇拿掉 prev／next，但它拿含 base 的 href（`investment/knowledge/…`）和不含 base 的頁面 id 比對，**網站有 base 時永遠對不上**，最後一篇知識的「下一篇」會連到決策 0001。用 Starlight 的 route middleware 自己補：

```ts
// site/route-middleware.ts
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const sectionOf = (href: string) => href.slice(base.length).split('/').filter(Boolean)[0];
export const onRequest = defineRouteMiddleware(({ locals }) => {
  const { id, pagination } = locals.starlightRoute;
  const here = id.split('/')[0];
  if (pagination.prev && sectionOf(pagination.prev.href) !== here) pagination.prev = undefined;
  if (pagination.next && sectionOf(pagination.next.href) !== here) pagination.next = undefined;
});
```

## 分區放在頂部：覆寫 Header

外掛預設把分區清單放在側欄最上面。要放到頂部，覆寫 Header，**原本的 Header 整個保留**，下面多一列：

```astro
---
import Default from '@astrojs/starlight/components/Header.astro';
import TopicTabs from './TopicTabs.astro';
const { isPageWithTopic } = Astro.locals.starlightSidebarTopics;
---
<div class="flex h-full flex-col">
  <div class="min-h-0 flex-1"><Default /></div>
  {isPageWithTopic && <TopicTabs class="-mb-3 max-md:hidden" />}
</div>
```

```css
/* 頂部列加高（Starlight 的版面都用 --sl-nav-height 算位置，改這個變數就好） */
@media (min-width: 50rem) {
  :root:has(header [data-topic-tabs]) { --sl-nav-height: 6.25rem; }
}
```

- 50rem 以下（沒有側欄、用漢堡選單）把同一個元件放在 Sidebar 覆寫的最上面（`md:hidden`）
- Tailwind 的 `md` 預設 48rem，和 Starlight 的 50rem 不一致：在 `@theme` 設 `--breakpoint-md: 50rem`
- Starlight 的元件可以從 `@astrojs/starlight/components/Header.astro`、`Sidebar.astro`、`MobileMenuFooter.astro` import

## 覆寫 Sidebar：自己畫側欄

- Starlight 在外層已經包了 `<nav aria-label="主要">`，覆寫的元件裡**不要再包 nav**
- 側欄資料：`Astro.locals.starlightRoute.sidebar`（`type: 'link' | 'group'`，link 有 `href`、`label`、`isCurrent`）
- 順序用每篇的 frontmatter `sidebar.order`（檔名不用改，網址不變）
- 手機版選單底部的主題切換、社群連結在 `MobileMenuFooter`，自己畫側欄時要記得放回去（`md:hidden`）

## daisyUI 元件的結構陷阱

| 元件 | 陷阱 |
|---|---|
| tabs | `.tab` 必須是 `.tabs` 的**直接子元素**（選擇器是 `.tabs > .tab`），中間多包 `ul > li` 樣式全部失效。`aria-current="page"` 就算選中 |
| tabs | 未選中的文字是「文字色 50% 透明」，淺色底上對比約 3:1，不到 AA；用自己的 `text-muted` 蓋過去（daisyUI 在 utilities 的子圖層，Tailwind utility 沒有子圖層，會贏） |
| steps | 圓圈裡的數字預設是 CSS counter（不在 DOM 裡，測試和螢幕閱讀器都讀不到）；要放真正的文字用 `<span class="step-icon">`，它也必須是 `.step` 的直接子元素 |
