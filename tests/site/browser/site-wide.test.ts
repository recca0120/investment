// 全站檢查（#58）：每一頁 × 電腦／手機。以前只測「這次改的那一頁」，改 A 弄壞 B 測不到；
// 這裡把網站一定要成立的規則對每一頁都檢查一次。
// 寫好時先在有問題的版本上跑過，確認每一條都抓得到已知問題（#58 的問題清單），才算數。
import { describe, expect, test } from 'vitest';
import { DESKTOP, MOBILE, openFrame } from './frame';

// 頁面清單：docs/ 底下每一篇（README 不發佈）＋首頁。瀏覽器測試讀不到檔案系統，用 import.meta.glob 在轉譯時展開
const PAGES = [
  '',
  ...Object.keys(import.meta.glob('../../../docs/**/*.{md,mdx}'))
    .filter((f) => !f.endsWith('README.md'))
    .map((f) => f.replace('../../../docs/', '').replace(/\.mdx?$/, '').toLowerCase() + '/'),
];
const SIZES = [
  ['電腦', DESKTOP],
  ['手機', MOBILE],
] as const;

type Frame = Awaited<ReturnType<typeof openFrame>>;
const where = (el: Element) => `<${el.tagName.toLowerCase()}>「${el.textContent!.trim().replace(/\s+/g, ' ').slice(0, 12)}」`;

/** 每一個名詞連結都要看得到、點得到：在它每一行的位置點下去，拿到的是它自己（沒選到的分頁裡的不算） */
function hiddenGlossaryLinks({ doc }: Frame) {
  const view = doc.defaultView!;
  const bad: string[] = [];
  for (const a of doc.querySelectorAll<HTMLElement>('a.glossary-link')) {
    const panel = a.closest<HTMLElement>('[role="tabpanel"]');
    if (panel?.hidden) continue;
    a.scrollIntoView({ block: 'center' });
    const ok = [...a.getClientRects()]
      .filter((r) => r.width > 0 && r.height > 0)
      .some((r) => {
        const hit = doc.elementFromPoint(r.left + Math.min(r.width / 2, 8), r.top + r.height / 2);
        return !!hit && (hit === a || a.contains(hit));
      });
    if (!ok) bad.push(a.textContent!);
  }
  view.scrollTo(0, 0);
  return bad;
}

describe.each(PAGES)('/%s', (path) => {
  test('[#58-1] 電腦：重點框、標題、段落、引言、清單、資料來源對齊內容欄', async () => {
    const page = await openFrame(path, { size: DESKTOP });
    try {
      const content = page.doc.querySelector('.sl-markdown-content');
      if (!content) return; // 首頁沒有文章內容欄
      const ref = content.getBoundingClientRect();
      const off = [
        page.doc.querySelector('[aria-labelledby="page-summary"]'),
        ...content.querySelectorAll(':scope > :is(.sl-heading-wrapper, p, blockquote, ul, ol, details), :scope > details > summary'),
      ]
        .filter((el): el is Element => !!el && el.getBoundingClientRect().width > 0)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return Math.abs(r.left - ref.left) > 2 || Math.abs(r.right - ref.right) > 2;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${where(el)} 左 ${Math.round(r.left - ref.left)}、右 ${Math.round(r.right - ref.right)}`;
        });
      expect(off.join('\n'), '問題清單').toBe('');
    } finally {
      page.close();
    }
  });

  test.each(SIZES)('[#58-2] %s：每個名詞連結都看得到、點得到', async (_, size) => {
    const page = await openFrame(path, { size });
    try {
      expect(hiddenGlossaryLinks(page).join('、'), '看不到或點不到的名詞').toBe('');
    } finally {
      page.close();
    }
  });

  test.each(SIZES)('[#58-3] %s：表格不用左右滑、沒有東西超出內容欄、格子沒被擠扁；依列排的表每一格看得到欄名', async (_, size) => {
    const page = await openFrame(path, { size });
    try {
      const content = page.doc.querySelector('.sl-markdown-content');
      if (!content) return;
      const view = page.doc.defaultView!;
      const ref = content.getBoundingClientRect();
      const bad: string[] = [];
      for (const table of content.querySelectorAll('table')) {
        const box = table.closest('[data-table-scroll]') ?? table;
        if (box.scrollWidth > box.clientWidth + 1) bad.push(`表格要左右滑：${where(table)} ${box.scrollWidth} > ${box.clientWidth}`);
        const r = table.getBoundingClientRect();
        if (r.right > ref.right + 2) bad.push(`表格超出內容欄：${where(table)}`);
        // 還是表格的話：每一格不能被擠成一兩個字一行（2026-11-04 截圖看到的）
        if (view.getComputedStyle(table.querySelector('tbody td') ?? table).display === 'table-cell') {
          for (const cell of table.querySelectorAll<HTMLElement>('tbody td')) {
            // 只算格子本身的文字；圓圈標籤（例如首頁的「含息再投」）這類 inline-block 本來就是兩行，不算
            const texts: Text[] = [];
            const walker = page.doc.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              let inBadge = false;
              for (let el = n.parentElement; el && el !== cell; el = el.parentElement)
                if (/^inline-(block|grid|flex)$/.test(view.getComputedStyle(el).display)) inBadge = true;
              if (!inBadge && n.textContent!.trim()) texts.push(n as Text);
            }
            const tops = texts.flatMap((t) => {
              const range = page.doc.createRange();
              range.selectNodeContents(t);
              return [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top));
            });
            const lines = new Set(tops).size;
            // 格子的寬度放得下幾個中文字（中文字寬約 1em）；只看折成 3 行以上的格子，數字、短字一行放得下就不算
            const st = view.getComputedStyle(cell);
            const chars = (cell.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight)) / parseFloat(st.fontSize);
            if (lines >= 3 && chars < 5) bad.push(`擠成一行 ${chars.toFixed(1)} 字寬（${lines} 行）：${where(cell)}`);
          }
        }
        // 依列排的表：每一格（第一格是小標題除外）前面要寫欄名
        if (view.getComputedStyle(table.querySelector('tbody td') ?? table).display !== 'table-cell') {
          for (const row of table.querySelectorAll('tbody tr'))
            for (const cell of [...row.children].slice(1)) {
              const label = view.getComputedStyle(cell, '::before').content;
              if (!label || label === 'none' || label === 'normal') bad.push(`沒有欄名：${where(cell)}`);
            }
        }
      }
      expect(bad.join('\n'), '問題清單').toBe('');
    } finally {
      page.close();
    }
  });
});
