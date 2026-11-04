// 內文一行約 38 字（#52，決策 0006）：段落、清單限制寬度；表格可以比內文寬
import { describe, expect, test } from 'vitest';
import { DESKTOP, openFrame } from './frame';

// 瀏覽器測試讀不到檔案系統：清單在 node 端由 vitest 轉成常數（import.meta.glob）
const ARTICLES = Object.keys(import.meta.glob('../../../docs/knowledge/[0-9][0-9]-*.{md,mdx}'))
  .map((f) => f.split('/').pop()!.replace(/\.mdx?$/, ''))
  .map((slug) => `knowledge/${slug}/`);

const WIDTHS = [DESKTOP, { width: 1100, height: 900 }];

/** 一行可以放幾個中文字：內容寬度 ÷ 字級（中文字寬約 1em） */
const charsPerLine = (el: Element) => {
  const s = el.ownerDocument.defaultView!.getComputedStyle(el);
  const width = el.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  return width / parseFloat(s.fontSize);
};

describe.each(WIDTHS)('電腦 $width px', (size) => {
  test.each(ARTICLES)('[#52-1] %s：段落與清單一行 36～40 字', async (path) => {
    const page = await openFrame(path, { size });
    try {
      const blocks = [...page.doc.querySelectorAll('.sl-markdown-content :is(p, li)')].filter(
        (el) =>
          !el.closest('table, .not-content, details, nav') &&
          !el.parentElement!.closest('li') && // 第二層清單多縮排一次，本來就比較短
          el.textContent!.trim().length > 20 &&
          el.getBoundingClientRect().width > 0, // 沒選到的分頁是隱藏的
      );
      expect(blocks.length, '這篇應該有夠長的段落').toBeGreaterThan(0);
      const wrong = blocks
        .map((el) => ({ text: el.textContent!.trim().slice(0, 10), chars: charsPerLine(el) }))
        .filter(({ chars }) => chars < 36 || chars > 40)
        .map(({ text, chars }) => `「${text}」一行 ${chars.toFixed(1)} 字`);
      expect(wrong).toEqual([]);
    } finally {
      page.close();
    }
  });
});

test('[#52-2] 電腦 1400px：表格比內文寬，不跟著變窄', async () => {
  const page = await openFrame('knowledge/08-us-stock-channels-tax/');
  try {
    const p = page.doc.querySelector('.sl-markdown-content > p')!;
    const table = [...page.doc.querySelectorAll('.sl-markdown-content table')].find((t) =>
      t.querySelector('thead')?.textContent?.includes('複委託'),
    )!;
    expect(table.getBoundingClientRect().width).toBeGreaterThan(p.getBoundingClientRect().width + 32);
  } finally {
    page.close();
  }
});
