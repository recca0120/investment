// 在真實瀏覽器（Vitest Browser Mode ＋ Chrome）裡打開 build 好的頁面，檢查手機寬度的版面
import { describe, expect, test } from 'vitest';
import { MOBILE, openFrame } from './frame';

// 每一篇知識文章（表格最多、最容易撐破版面）＋首頁
const articles = Object.keys(import.meta.glob('/docs/knowledge/[0-9]*.{md,mdx}')).map(
  (f) => `knowledge/${f.split('/').pop()!.replace(/\.mdx?$/, '')}/`,
);
const pages = [{ name: '首頁', path: '' }, ...articles.map((path) => ({ name: path, path }))];

describe('手機版面（375px）', () => {
  test('有找到要檢查的文章', () => {
    expect(articles.length).toBeGreaterThan(5);
  });

  test.each(pages)('[#15-7] $name 沒有水平捲動', async ({ path }) => {
    const { doc, close } = await openFrame(path, { size: MOBILE });
    try {
      expect(doc.title, '頁面沒有正確載入（先執行 npm run build）').not.toMatch(/404|Not Found/i);
      expect(doc.querySelector('main'), '頁面沒有 <main>').not.toBeNull();
      const { scrollWidth, clientWidth } = doc.documentElement;
      expect(scrollWidth, `內容寬 ${scrollWidth}px，超出畫面 ${clientWidth}px`).toBeLessThanOrEqual(clientWidth);
    } finally {
      close();
    }
  });
});
