# 設定檔範例（Astro 7.4 ＋ Starlight 0.42，已 build 驗證）

## package.json

```json
{
  "name": "investment-site",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/markdown-remark": "^7.3.0",
    "@astrojs/starlight": "^0.42.8",
    "astro": "^7.4.5",
    "sharp": "^0.35.3",
    "unist-util-visit": "^5.0.0"
  }
}
```

- `unist-util-visit` 在 node_modules 裡雖然會以間接依賴的形式存在，但 `rehype-md-links.mjs` 直接 import 它，所以要明確列出，避免哪天上游移除後壞掉
- 記得 commit `package-lock.json`，`withastro/action` 靠 lockfile 判斷要用哪個套件管理器

## astro.config.mjs

```js
// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import rehypeMdLinks from './site/plugins/rehype-md-links.mjs';

const base = '/investment'; // GitHub Pages 專案站：/<repo 名稱>

export default defineConfig({
  site: 'https://recca0120.github.io',
  base,
  srcDir: './site',
  markdown: {
    // Astro 7 預設用 Sätteri；要用 rehype plugin 必須切回 unified
    processor: unified({
      rehypePlugins: [[rehypeMdLinks, { contentDir: './docs', base }]],
    }),
  },
  integrations: [
    starlight({
      title: '投資學習筆記',
      description: '股市新手的投資學習筆記',
      // 內容不在 src/content/docs 時必須設定，否則提示框、標題錨點等 Starlight 轉換不會套用
      markdown: { processedDirs: ['./docs'] },
      defaultLocale: 'root',
      locales: {
        root: { label: '繁體中文', lang: 'zh-TW' }, // 單一語言，網址不會有 /zh-tw/ 前綴
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/recca0120/investment' },
      ],
      editLink: {
        baseUrl: 'https://github.com/recca0120/investment/edit/main/',
      },
      sidebar: [
        // Starlight 0.39+：autogenerate 必須包在 items 裡
        { label: '投資知識', items: [{ autogenerate: { directory: 'knowledge' } }] },
        { label: '決策紀錄', items: [{ autogenerate: { directory: 'decisions' } }] },
        { label: '討論紀錄', items: [{ autogenerate: { directory: 'log' } }] },
      ],
    }),
  ],
});
```

### 補充

- `editLink.baseUrl` 會接上「內容檔相對於專案根目錄的路徑」。內容在 `docs/` 時，產生的連結是 `.../edit/main/docs/knowledge/xxx.md`，所以 baseUrl 結尾只寫到 `main/`。建好後要實際點一次確認
- 側欄排序：`autogenerate` 依檔名排序，所以知識文章用 `01-`、`02-` 前綴控制順序。也可以在 frontmatter 寫 `sidebar: { order: 1 }`
- 想讓某一頁不出現在側欄：frontmatter 加 `sidebar: { hidden: true }`
- 首頁：`docs/index.md`（或 `.mdx`），可以用 `template: splash` 加上 `hero` 區塊

## site/content.config.ts

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  // collection 名稱必須是 docs，Starlight 靠這個名稱找內容
  docs: defineCollection({
    // 不用 docsLoader()：它的路徑寫死在 src/content/docs
    loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './docs' }),
    schema: docsSchema(),
  }),
};
```

`glob` 的 `base` 是相對於專案根目錄（`package.json` 所在的位置），不是相對於 `srcDir`。

想在 frontmatter 加自訂欄位（例如 `updated`、`sources`）時：

```ts
import { z } from 'astro/zod';

schema: docsSchema({
  extend: z.object({
    updated: z.coerce.date().optional(),
  }),
}),
```

## tsconfig.json

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", ".venv"],
  "compilerOptions": {
    "paths": { "@site/*": ["./site/*"] }
  }
}
```

`@site/*` 別名讓 `docs/` 裡的 MDX 可以寫 `import X from '@site/components/X.astro'`，不用寫一長串 `../../site/...`。已驗證 Vite 會讀取這個設定。

## .gitignore 需要的項目

```
node_modules/
dist/
.astro/
```

不要有 `site/`。
