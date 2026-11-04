// 名詞小卡（#50）：在真實瀏覽器點名詞、用鍵盤、換手機寬度
import { describe, expect, test } from 'vitest';
import { commands, page as testPage } from 'vitest/browser';
import { MOBILE, openFrame } from './frame';

const PAGE = 'knowledge/07-dca-backtest-2016-2026/';
type Frame = Awaited<ReturnType<typeof openFrame>>;

const open = (page: Frame) => page.doc.querySelector<HTMLElement>('.glossary-card:popover-open');
const firstTerm = (page: Frame) => page.doc.querySelector<HTMLAnchorElement>('.sl-markdown-content li a.glossary-link[data-card]')!;
const wait = (ms = 50) => new Promise((r) => setTimeout(r, ms));

describe('名詞小卡', () => {
  test('[#50-1] 點名詞在原頁打開小卡，網址不變', async () => {
    const page = await openFrame(PAGE);
    try {
      const before = page.doc.location.href;
      const link = firstTerm(page);
      link.click();
      await wait();
      expect(page.doc.location.href, '不能離開文章').toBe(before);
      expect(open(page)?.id).toBe(link.dataset.card);
    } finally {
      page.close();
    }
  });

  test('[#50-3] Esc、點外面、點 ✕ 都會關閉；Tab 到名詞按 Enter 也能打開', async () => {
    // 真的滑鼠點擊需要元素在測試頁面的可見範圍內：測試頁預設只有 414×896，放大到裝得下 1400px 的 iframe
    await testPage.viewport(1500, 1100);
    const page = await openFrame(PAGE);
    try {
      const link = firstTerm(page);
      link.scrollIntoView({ block: 'center' });
      const frameRect = page.doc.defaultView!.frameElement!.getBoundingClientRect();
      /** 在 iframe 裡某個元素的中心送出真的滑鼠點擊 */
      const realClick = async (el: Element) => {
        const r = el.getBoundingClientRect();
        await commands.mouseClick(frameRect.left + r.left + r.width / 2, frameRect.top + r.top + r.height / 2);
        await wait();
      };

      await realClick(link);
      expect(open(page)?.id, '點名詞要打開').toBe(link.dataset.card);
      await commands.pressKey('Escape');
      await wait();
      expect(open(page), 'Esc 要關閉').toBeNull();

      await realClick(link);
      await realClick(page.doc.querySelector('h1')!); // 卡片外面
      expect(open(page), '點外面要關閉').toBeNull();

      await realClick(link);
      await realClick(open(page)!.querySelector('button')!);
      expect(open(page), '點 ✕ 要關閉').toBeNull();

      link.focus();
      expect(page.doc.activeElement, '名詞要能用 Tab 選到').toBe(link);
      await commands.pressKey('Enter');
      await wait();
      expect(open(page)?.id, '按 Enter 要打開').toBe(link.dataset.card);
    } finally {
      page.close();
    }
  });

  test('[#50-4] 手機 375px：小卡從底部升起、佔滿寬度，頁面不會水平捲動', async () => {
    const page = await openFrame(PAGE, { size: MOBILE });
    try {
      firstTerm(page).click();
      await wait();
      const card = open(page)!.getBoundingClientRect();
      const view = page.doc.defaultView!;
      expect(Math.round(card.bottom), '貼齊畫面底部').toBe(view.innerHeight);
      expect(Math.round(card.width), '佔滿寬度').toBe(view.innerWidth);
      expect(page.doc.documentElement.scrollWidth).toBeLessThanOrEqual(page.doc.documentElement.clientWidth);
    } finally {
      page.close();
    }
  });

  test('[#50-4] 電腦：小卡出現在名詞附近，完整在畫面內', async () => {
    const page = await openFrame(PAGE);
    try {
      const link = firstTerm(page);
      link.scrollIntoView({ block: 'center' });
      link.click();
      await wait();
      const card = open(page)!.getBoundingClientRect();
      const term = link.getBoundingClientRect();
      const view = page.doc.defaultView!;
      expect(card.top).toBeGreaterThanOrEqual(0);
      expect(card.left).toBeGreaterThanOrEqual(0);
      expect(card.bottom).toBeLessThanOrEqual(view.innerHeight);
      expect(card.right).toBeLessThanOrEqual(view.innerWidth);
      // 在名詞正下方或正上方（垂直距離在 1rem 內），不是固定在畫面某個角落
      const gap = Math.min(Math.abs(card.top - term.bottom), Math.abs(term.top - card.bottom));
      expect(gap, `小卡和名詞的距離 ${gap}px`).toBeLessThan(16);
    } finally {
      page.close();
    }
  });
});
