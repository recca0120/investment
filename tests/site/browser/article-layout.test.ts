// 文章頁版面（#22）：寬表格讀得下去、daisyUI 不影響 Starlight 原本的內文樣式
import { describe, expect, test } from 'vitest';
import { DESKTOP, MOBILE, openFrame } from './frame';

const ARTICLE_08 = 'knowledge/08-us-stock-channels-tax/';

/** 找出表頭含有這些文字的表格 */
function tableWith(doc: Document, ...headers: string[]) {
  const table = [...doc.querySelectorAll('table')].find((t) =>
    headers.every((h) => t.querySelector('thead')?.textContent?.includes(h)),
  );
  expect(table, `找不到表頭含 ${headers.join('、')} 的表格`).toBeDefined();
  return table!;
}

describe('文章 08「四種管道比較」表格', () => {
  test('[#22-4] 桌機 1400px：每一格至少放得下 4 個中文字', async () => {
    const page = await openFrame(ARTICLE_08, { size: DESKTOP });
    try {
      const view = page.doc.defaultView!;
      const cells = [...tableWith(page.doc, '複委託', '海外券商').querySelectorAll('tbody td, tbody th')];
      const narrow = cells
        .map((cell) => {
          const s = view.getComputedStyle(cell);
          const content = cell.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
          return { text: cell.textContent!.trim().slice(0, 8), chars: content / parseFloat(s.fontSize) };
        })
        .filter(({ chars }) => chars < 4)
        .map(({ text, chars }) => `「${text}」只有 ${chars.toFixed(1)} 字寬`);
      expect(narrow).toEqual([]);
    } finally {
      page.close();
    }
  });

  // 文字表在手機上改成依列排（#54、#58，compare-table.test.ts、site-wide.test.ts），這裡不再要求左右滑
});

// [#22-4] 手機「表格放不下時自己左右滑」已由 #58 取代：手機上沒有任何表格要左右滑，文字表和 5 欄以上的表改成依列排（site-wide.test.ts 的 [#58-3]）

test.each(['light', 'dark'] as const)('[#22-12] %s：加入 daisyUI 後，內文的清單、標題、段落樣式不變', async (theme) => {
  // 01 的外層清單只有資料來源（已收進 details），清單改看 02 的「共同點」
  const list = await openFrame('knowledge/02-recommended-methods/', { theme });
  const text = await openFrame('knowledge/01-getting-started/', { theme });
  try {
    expect(list.style('.sl-markdown-content > ul > li').listStyleType).toBe('disc');
    expect(Number(text.style('.sl-markdown-content h2').fontWeight)).toBeGreaterThanOrEqual(700);
    expect(parseFloat(text.style('.sl-markdown-content h2').fontSize)).toBeGreaterThan(24);
    expect(parseFloat(text.style('.sl-markdown-content > .sl-heading-wrapper + p').marginTop)).toBeGreaterThan(0);
  } finally {
    list.close();
    text.close();
  }
});

test('[#22-3] 文章 07 的結果分頁可以用鍵盤左右鍵切換', async () => {
  const page = await openFrame('knowledge/07-dca-backtest-2016-2026/');
  try {
    const tabs = [...page.doc.querySelectorAll<HTMLElement>('[role="tab"]')];
    // #53 起分頁改成「其他算法」：主要結果不放在分頁裡
    expect(tabs.map((t) => t.textContent!.trim())).toEqual(['只看價格', 'VT 用美元算', '匯率和稅']);
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(page.doc.activeElement).toBe(tabs[1]);
    const panel = page.doc.getElementById(tabs[1].getAttribute('href')!.slice(1))!; // Starlight 的分頁用 href 指向面板
    expect(panel.hidden, '切換後要看得到第二個分頁的內容').toBe(false);
  } finally {
    page.close();
  }
});

test('[#53-4] 手機 375px：文章 07「結果」第一張表四欄都看得到，不用左右滑', async () => {
  const page = await openFrame('knowledge/07-dca-backtest-2016-2026/', { size: MOBILE });
  try {
    const table = page.doc.querySelector<HTMLElement>('.sl-markdown-content table')!;
    expect(table.querySelector('thead')!.textContent).toContain('最大跌幅');
    const scroller = table.closest<HTMLElement>('[data-table-scroll]') ?? table;
    expect(scroller.scrollWidth, '表格比畫面寬').toBeLessThanOrEqual(scroller.clientWidth);
  } finally {
    page.close();
  }
});
