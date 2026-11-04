// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import rehypeMdLinks from './site/plugins/rehype-md-links.mjs';
import rehypeNumCells from './site/plugins/rehype-num-cells.mjs';
import rehypeGlossaryLinks from './site/plugins/rehype-glossary-links.mjs';
import rehypeCollapseSources from './site/plugins/rehype-collapse-sources.mjs';
import designTokens from './site/design/integration.ts';
import starlightSidebarTopics from 'starlight-sidebar-topics';

const base = '/investment'; // GitHub Pages 專案站：/<repo 名稱>

export default defineConfig({
  site: 'https://recca0120.github.io',
  base,
  srcDir: './site',
  vite: { plugins: [tailwindcss()] },
  markdown: {
    // Astro 7 預設用 Sätteri；要用 rehype plugin 必須切回 unified
    processor: unified({
      rehypePlugins: [
        [rehypeMdLinks, { contentDir: './docs', base }],
        rehypeNumCells,
        // 知識文章裡的名詞第一次出現時連到名詞解釋（#24）
        [rehypeGlossaryLinks, { glossaryDir: './docs/glossary', contentDir: './docs', base }],
        rehypeCollapseSources, // 結尾的「資料來源」收合並標示筆數（#22）
      ],
    }),
  },
  integrations: [
    designTokens(), // site/design/tokens.ts → site/styles/generated/tokens.css
    starlight({
      title: '投資學習筆記',
      description: '股市新手的投資學習筆記',
      customCss: ['./site/styles/global.css'], // Tailwind ＋ daisyUI；顏色原始值在 site/design/tokens.ts
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Chiron+GoRound+TC:wght@400;700;900&display=swap',
          },
        },
      ],
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
      // 網站分成三區，各有自己的側欄，「上一篇／下一篇」不跨區（#22，決策 0006）
      // link 不含 base（外掛會自動加上 /investment）
      plugins: [
        starlightSidebarTopics(
          [
            { id: 'knowledge', label: '投資知識', link: '/knowledge/01-getting-started/', items: [{ autogenerate: { directory: 'docs/knowledge' } }] },
            { id: 'glossary', label: '名詞解釋', link: '/glossary/01-accounts-trading/', items: [{ autogenerate: { directory: 'docs/glossary' } }] },
            { id: 'tools', label: '工具', link: '/tools/backtest/', items: [{ autogenerate: { directory: 'docs/tools' } }] },
            { id: 'decisions', label: '決策紀錄', link: '/decisions/0001-repo-structure/', items: [{ autogenerate: { directory: 'docs/decisions' } }] },
            { id: 'log', label: '討論紀錄', link: '/log/2026-11-03-kickoff/', items: [{ autogenerate: { directory: 'docs/log' } }] },
          ],
          { exclude: ['/'] }, // 首頁不屬於任何一區
        ),
      ],
      routeMiddleware: './site/route-middleware.ts', // 上一篇／下一篇不跨區（補外掛遇到 base 時的問題）
      components: {
        Header: './site/components/starlight/Header.astro', // 頂部加上三個分區
        Sidebar: './site/components/starlight/Sidebar.astro', // 知識區畫成路線；手機版在選單裡放分區
        PageTitle: './site/components/starlight/PageTitle.astro', // 標題下方的「重點」
      },
    }),
  ],
});
