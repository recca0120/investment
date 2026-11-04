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
  // 段落 36～40 字（目標 38）。#58 改成整欄同寬、所有區塊對齊之後：
  // - 清單有縮排，一行約 35.5 字；引言字比較小，一行約 41 字
  // - 兩者都還在 W3C clreq 的建議內（書籍內文 17～40 字、橫排不超過 48 字），所以放寬成 34～42，不是為了讓測試過
  test.each(ARTICLES)('[#52-1] %s：段落一行 36～40 字，清單和引言 34～42 字', async (path) => {
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
        .map((el) => ({ el, text: el.textContent!.trim().slice(0, 10), chars: charsPerLine(el) }))
        .filter(({ el, chars }) => (el.closest('li, blockquote') ? chars < 34 || chars > 42 : chars < 36 || chars > 40))
        .map(({ text, chars }) => `「${text}」一行 ${chars.toFixed(1)} 字`);
      expect(wrong.join('\n'), '一行字數不對').toBe('');
    } finally {
      page.close();
    }
  });
});

// [#52-2]「表格比內文寬」已由 #58 取代：整欄同寬、所有區塊對齊（site-wide.test.ts 的 [#58-1]）
