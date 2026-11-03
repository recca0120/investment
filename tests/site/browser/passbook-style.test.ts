// 首頁存摺的樣式由 Tailwind utility class 產生（元件裡沒有 <style>），在真實瀏覽器中生效
import { describe, expect, test } from 'vitest';
import source from '../../../site/components/Passbook.astro?raw';
import { openFrame } from './frame';

describe('首頁存摺樣式', () => {
  test('[#17-2] 外框、底色、數字欄靠右、印章由 utility class 產生並生效', async () => {
    expect(source, 'Passbook.astro 應該只用 utility class，不要寫 <style>').not.toMatch(/<style[\s>]/);

    const { style, close } = await openFrame('', { theme: 'light' });
    try {
      const figure = style('figure.passbook');
      expect(figure.backgroundColor).toBe('rgb(243, 247, 245)'); // 存摺內頁 #f3f7f5
      expect(figure.borderTopWidth).toBe('1px');
      expect(figure.borderTopColor).toBe('rgb(197, 211, 205)'); // 格線 #c5d3cd
      expect(style('figure.passbook tbody td:last-child').textAlign).toBe('right');
      expect(style('figure.passbook tbody td:first-child').textAlign).toBe('left');
      const seal = style('[aria-label="印章：含息再投入"]');
      expect(seal.backgroundColor).toBe('rgb(179, 38, 30)'); // 印章紅 #b3261e
      expect(seal.position).toBe('absolute');
    } finally {
      close();
    }
  });
});
