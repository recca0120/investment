// 首頁撲滿的樣式由 Tailwind utility class 產生並在真實瀏覽器生效（#17-2 的條件，套用到改版後的元件）
import { describe, expect, test } from 'vitest';
import { openFrame } from './frame';

describe('首頁撲滿樣式', () => {
  test('[#17-2] 外框、底色、數字欄靠右、金幣由 utility class 產生並生效', async () => {
    const { style, close } = await openFrame('', { theme: 'light' });
    try {
      const figure = style('figure.piggy');
      expect(figure.backgroundColor).toBe('rgb(248, 251, 254)'); // 雲 #F8FBFE
      expect(figure.borderTopWidth).toBe('1px');
      expect(figure.borderTopColor).toBe('rgb(201, 216, 232)'); // 格線 #C9D8E8
      expect(parseFloat(figure.borderTopLeftRadius)).toBeGreaterThanOrEqual(16); // 圓角，輕鬆一點
      expect(style('figure.piggy tbody td:last-child').textAlign).toBe('right');
      expect(style('figure.piggy tbody td:first-child').textAlign).toBe('left');
      const coin = style('[aria-label="金幣：含息再投入"]');
      expect(coin.backgroundColor).toBe('rgb(242, 182, 50)'); // 金幣 #F2B632
      expect(coin.width).toBe(coin.height);
      expect(parseFloat(coin.borderTopLeftRadius), '金幣是圓形').toBeGreaterThanOrEqual(parseFloat(coin.width) / 2);
    } finally {
      close();
    }
  });
});
