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
    const article = await openFrame('knowledge/01-getting-started/', { theme });
    const home = await openFrame('', { theme });
    try {
      const bg = article.style('body').backgroundColor;
      const pairs = {
        內文: article.style('.sl-markdown-content > p').color,
        標題: article.style('.sl-markdown-content h2').color,
        引言: article.style('.sl-markdown-content blockquote').color,
        連結: article.style('.sl-markdown-content li > a').color,
        側欄: article.style('.sidebar-content a:not([aria-current])').color,
        首頁說明: home.style('.reading li p').color,
      };
      for (const [name, color] of Object.entries(pairs)) {
        expect(contrast(color, bg), `${name} ${color} 對 ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    } finally {
      article.close();
      home.close();
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
