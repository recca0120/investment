// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import rehypeMdLinks from './site/plugins/rehype-md-links.mjs';
import rehypeNumCells from './site/plugins/rehype-num-cells.mjs';

const base = '/investment'; // GitHub Pages 專案站：/<repo 名稱>

export default defineConfig({
  site: 'https://recca0120.github.io',
  base,
  srcDir: './site',
  markdown: {
    // Astro 7 預設用 Sätteri；要用 rehype plugin 必須切回 unified
    processor: unified({
      rehypePlugins: [[rehypeMdLinks, { contentDir: './docs', base }], rehypeNumCells],
    }),
  },
  integrations: [
    starlight({
      title: '投資學習筆記',
      description: '股市新手的投資學習筆記',
      customCss: ['./site/styles/theme.css'],
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap',
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
      sidebar: [
        // Starlight 0.39+：autogenerate 必須包在 items 裡
        { label: '投資知識', items: [{ autogenerate: { directory: 'docs/knowledge' } }] },
        { label: '決策紀錄', items: [{ autogenerate: { directory: 'docs/decisions' } }] },
        { label: '討論紀錄', items: [{ autogenerate: { directory: 'docs/log' } }] },
      ],
    }),
  ],
});
