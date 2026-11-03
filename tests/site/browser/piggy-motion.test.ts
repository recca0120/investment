// 首頁撲滿的動畫：硬幣依序掉進撲滿、金額跟著跳；減少動態效果時直接顯示最終狀態
import { commands } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import { openFrame } from './frame';

declare module 'vitest/browser' {
  interface BrowserCommands {
    setReducedMotion: (reduce: boolean) => Promise<void>;
  }
}

const finalValue = () => import('../../../site/data/passbook.json').then((m) => m.default.final.toLocaleString('zh-TW'));
const css = (el: Element) => el.ownerDocument.defaultView!.getComputedStyle(el);

afterEach(() => commands.setReducedMotion(false));

describe('撲滿動畫', () => {
  test('[#19-3] 一般設定：硬幣依序掉落，金額從 0 一路跳到目前市值', async () => {
    const final = await finalValue();
    // 不等 load：外部字型樣式表在平行測試時可能拖慢 load，動畫早就播完了。
    // 元素一出現就開始記錄金額的每一次變化
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:1400px;height:1000px;border:0';
    document.body.append(frame);
    frame.src = '/investment/';
    try {
      const value = await expect
        .poll(() => frame.contentDocument?.querySelector('[data-piggy-value]'), { timeout: 8000, interval: 5 })
        .toBeTruthy()
        .then(() => frame.contentDocument!.querySelector('[data-piggy-value]')!);
      const seen: string[] = [value.textContent!];
      new MutationObserver(() => seen.push(value.textContent!)).observe(value, { childList: true, characterData: true, subtree: true });

      // HTML 裡一開始就是最終金額（不執行 JS 時的樣子）；script 啟動後先歸零，再一年一年往上跳
      await expect.poll(() => seen, { timeout: 8000, interval: 20, message: '金額沒有歸零：動畫的 script 沒有執行' }).toContain('0');
      await expect.poll(() => seen.at(-1), { timeout: 10000, interval: 100 }).toBe(final);
      const distinct = [...new Set(seen)];
      expect(distinct.length, '要依序經過多個年度的金額').toBeGreaterThanOrEqual(4);

      const coins = [...frame.contentDocument!.querySelectorAll<SVGElement>('[data-coin]')];
      expect(coins.length).toBeGreaterThan(5);
      expect(new Set(coins.map((c) => css(c).animationName))).toEqual(new Set(['coin-drop']));
      const delays = coins.map((c) => parseFloat(css(c).animationDelay));
      expect(delays, '硬幣要依序掉落').toEqual([...delays].sort((a, b) => a - b));
    } finally {
      frame.remove();
    }
  });

  test('[#19-3] 減少動態效果：不播放動畫，直接顯示目前市值', async () => {
    await commands.setReducedMotion(true);
    const final = await finalValue();
    const { doc, close } = await openFrame('');
    try {
      expect(doc.querySelector('[data-piggy-value]')!.textContent).toBe(final);
      for (const coin of doc.querySelectorAll<SVGElement>('[data-coin]')) {
        expect(css(coin).animationName).toBe('none');
      }
    } finally {
      close();
    }
  });
});
