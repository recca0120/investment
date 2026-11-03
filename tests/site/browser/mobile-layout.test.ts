// 在真實瀏覽器（Vitest Browser Mode ＋ Chrome）裡打開 build 好的頁面，檢查手機寬度的版面
// 頁面由 tests/site/support/serve-dist.ts 在 /investment/ 底下提供，用同源 iframe 才讀得到版面資訊
import { describe, expect, test } from 'vitest';

const MOBILE = { width: 375, height: 812 }; // iPhone 13 mini 等常見手機寬度

// 每一篇知識文章（表格最多、最容易撐破版面）＋首頁
const articles = Object.keys(import.meta.glob('/docs/knowledge/[0-9]*.md')).map(
  (f) => `knowledge/${f.split('/').pop()!.replace(/\.md$/, '')}/`,
);
const pages = [{ name: '首頁', path: '' }, ...articles.map((path) => ({ name: path, path }))];

async function open(path: string, size = MOBILE) {
  const frame = document.createElement('iframe');
  frame.style.cssText = `width:${size.width}px;height:${size.height}px;border:0`;
  document.body.append(frame);
  await new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve();
    frame.onerror = () => reject(new Error(`打不開 ${path}`));
    frame.src = `/investment/${path}`;
  });
  const doc = frame.contentDocument!;
  await doc.fonts?.ready;
  return { doc, close: () => frame.remove() };
}

describe('手機版面（375px）', () => {
  test('有找到要檢查的文章', () => {
    expect(articles.length).toBeGreaterThan(5);
  });

  test.each(pages)('[#15-7] $name 沒有水平捲動', async ({ path }) => {
    const { doc, close } = await open(path);
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
