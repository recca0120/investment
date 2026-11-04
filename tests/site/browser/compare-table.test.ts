// 比較表（第一格表頭是空的表）：手機上依項目排，不用左右滑（#54）
import { describe, expect, test } from 'vitest';
import { DESKTOP, MOBILE, openFrame } from './frame';

const PAGES = ['knowledge/08-us-stock-channels-tax/', 'knowledge/06-data-sources/'];

const compareTables = (doc: Document) =>
  [...doc.querySelectorAll<HTMLTableElement>('.sl-markdown-content table')].filter(
    (t) => t.querySelector('thead th')?.textContent?.trim() === '',
  );

describe.each(PAGES)('%s', (path) => {
  test('[#54-1] 手機 375px：比較表不用左右滑，每個項目是一個小標題', async () => {
    const page = await openFrame(path, { size: MOBILE });
    try {
      const tables = compareTables(page.doc);
      expect(tables.length, '這篇應該有比較表').toBeGreaterThan(0);
      for (const table of tables) {
        const scroller = table.closest<HTMLElement>('[data-table-scroll]') ?? table;
        expect(scroller.scrollWidth, '比較表比畫面寬').toBeLessThanOrEqual(scroller.clientWidth);
        for (const row of table.querySelectorAll('tbody tr')) {
          const item = row.firstElementChild!;
          const style = page.doc.defaultView!.getComputedStyle(item);
          expect(item.getBoundingClientRect().width, `「${item.textContent}」要佔滿一行，像小標題`).toBeGreaterThan(
            table.getBoundingClientRect().width * 0.9,
          );
          expect(Number(style.fontWeight), `「${item.textContent}」要粗體`).toBeGreaterThanOrEqual(700);
        }
      }
    } finally {
      page.close();
    }
  });

  test('[#54-2] 手機 375px：每一格都看得到它屬於哪一欄', async () => {
    const page = await openFrame(path, { size: MOBILE });
    try {
      const view = page.doc.defaultView!;
      for (const table of compareTables(page.doc)) {
        const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent!.trim());
        for (const row of table.querySelectorAll('tbody tr')) {
          [...row.children].slice(1).forEach((cell, i) => {
            const label = view.getComputedStyle(cell, '::before').content.replace(/^"|"$/g, '');
            expect(label, `「${cell.textContent!.slice(0, 8)}」前面要寫欄名`).toBe(headers[i + 1]);
          });
        }
        // 格子裡有名詞連結時，整格內容要在欄名的右邊、連在一起，不能被拆開塞進欄名那一欄（2026-11-04 截圖發現）
        for (const link of table.querySelectorAll('tbody td[data-label] a')) {
          const cell = link.closest('td')!;
          expect(link.getBoundingClientRect().left, `「${link.textContent}」跑到欄名那一欄`).toBeGreaterThan(
            cell.getBoundingClientRect().left + parseFloat(view.getComputedStyle(cell).fontSize) * 5,
          );
        }
        // 原本的表頭在手機上不顯示（每格都已經有欄名）
        expect(table.querySelector('thead')!.getBoundingClientRect().height).toBeLessThanOrEqual(1);
      }
    } finally {
      page.close();
    }
  });

  test('[#54-3] 電腦：比較表還是原本的表格', async () => {
    const page = await openFrame(path, { size: DESKTOP });
    try {
      const view = page.doc.defaultView!;
      for (const table of compareTables(page.doc)) {
        expect(view.getComputedStyle(table.querySelector('tbody td')!).display).toBe('table-cell');
        expect(view.getComputedStyle(table.querySelector('tbody td')!, '::before').content).toMatch(/none|normal/);
        expect(table.querySelector('thead')!.getBoundingClientRect().height).toBeGreaterThan(10);
      }
    } finally {
      page.close();
    }
  });
});
