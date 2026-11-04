// 配色：小豬撲滿風格（#19）。對比度依 WCAG 2.x 的相對亮度公式計算
import { describe, expect, test } from 'vitest';
import { openFrame } from './frame';

function luminance(rgb: string) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
};

const SKY = { light: 'rgb(234, 242, 250)', dark: 'rgb(18, 27, 38)' }; // #EAF2FA、#121B26

describe.each(['light', 'dark'] as const)('%s 模式', (theme) => {
  test(`[#19-4] 內文、次要文字、連結和底色的對比至少 4.5:1`, async () => {
    // 首頁的文字對比由 [#22-7] 逐一檢查每一段，這裡只看文章頁
    const article = await openFrame('knowledge/01-getting-started/', { theme });
    try {
      const bg = article.style('body').backgroundColor;
      const pairs = {
        內文: article.style('.sl-markdown-content > p').color,
        標題: article.style('.sl-markdown-content h2').color,
        引言: article.style('.sl-markdown-content blockquote').color,
        連結: article.style('.sl-markdown-content li > a').color,
        側欄: article.style('.sidebar-content a:not([aria-current])').color,
      };
      for (const [name, color] of Object.entries(pairs)) {
        expect(contrast(color, bg), `${name} ${color} 對 ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    } finally {
      article.close();
    }
  });

  test(`[#19-5] 字體是 Chiron GoRound TC，底色是天空藍`, async () => {
    const page = await openFrame('knowledge/01-getting-started/', { theme });
    try {
      expect(page.style('body').fontFamily).toMatch(/^"Chiron GoRound TC"/);
      expect(page.style('body').backgroundColor).toBe(SKY[theme]);
      expect(page.doc.fonts.check('16px "Chiron GoRound TC"', '撲滿')).toBe(true);
    } finally {
      page.close();
    }
  });
});

/** 從元素往上找第一個有底色的祖先，當作文字的底色 */
function backgroundOf(el: Element): string {
  const view = el.ownerDocument.defaultView!;
  for (let node: Element | null = el; node; node = node.parentElement) {
    const bg = view.getComputedStyle(node).backgroundColor;
    if (bg && !/rgba\(.*,\s*0\)$|transparent/.test(bg)) return bg;
  }
  return view.getComputedStyle(el.ownerDocument.body).backgroundColor;
}

describe.each(['light', 'dark'] as const)('%s 模式', (theme) => {
  test('[#22-7] 首頁新加的區塊（關鍵數字、新手路線、分區、最近更新）文字對比至少 4.5:1', async () => {
    const page = await openFrame('', { theme });
    try {
      const regions = ['回測的關鍵數字', '新手路線', '網站分區', '最近更新'].map((name) => {
        const heading = [...page.doc.querySelectorAll('h2')].find((h) => h.textContent!.trim() === name);
        expect(heading, `找不到「${name}」`).toBeDefined();
        return page.doc.querySelector(`[aria-labelledby="${heading!.id}"]`)!;
      });
      const view = page.doc.defaultView!;
      const low = regions.flatMap((region) =>
        [...region.querySelectorAll('*')]
          .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
          .filter((el) => !el.closest('[aria-hidden="true"], .sr-only'))
          .map((el) => ({ el, ratio: contrast(view.getComputedStyle(el).color, backgroundOf(el)) }))
          .filter(({ ratio }) => ratio < 4.5)
          .map(({ el, ratio }) => `「${el.textContent!.trim().slice(0, 12)}」${ratio}`),
      );
      expect(low).toEqual([]);
    } finally {
      page.close();
    }
  });
});

describe.each(['light', 'dark'] as const)('%s 模式', (theme) => {
  test('[#41-5] 回測器頁面（表單與說明）文字對比至少 4.5:1', async () => {
    const page = await openFrame('tools/backtest/', { theme });
    try {
      const root = page.doc.querySelector('[data-backtester]');
      expect(root, '找不到回測器').not.toBeNull();
      const view = page.doc.defaultView!;
      const low = [...root!.querySelectorAll('*')]
        .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
        .filter((el) => !el.closest('[aria-hidden="true"], .sr-only, svg'))
        .map((el) => ({ el, ratio: contrast(view.getComputedStyle(el).color, backgroundOf(el)) }))
        .filter(({ ratio }) => ratio < 4.5)
        .map(({ el, ratio }) => `「${el.textContent!.trim().slice(0, 12)}」${ratio}`);
      expect(low).toEqual([]);
    } finally {
      page.close();
    }
  });
});
