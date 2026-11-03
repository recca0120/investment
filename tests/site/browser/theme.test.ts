// 配色：導入 Tailwind 前後，Starlight 頁面的顏色要一樣
// 預期值是導入前（存摺帳本配色，docs/decisions/0004-site-design.md）在瀏覽器量到的 computed style
import { describe, expect, test } from 'vitest';
import { openFrame } from './frame';

const EXPECTED = {
  light: {
    bg: 'rgb(233, 239, 236)', // 紙 #e9efec
    text: 'rgb(51, 68, 76)',
    heading: 'rgb(31, 42, 46)', // 墨 #1f2a2e
    link: 'rgb(47, 93, 124)', // 藍墨水 #2f5d7c
    rule: 'rgb(197, 211, 205)', // 格線 #c5d3cd
  },
  dark: {
    bg: 'rgb(23, 33, 36)', // #172124
    text: 'rgb(194, 208, 203)',
    heading: 'rgb(244, 248, 246)',
    link: 'rgb(198, 220, 235)',
    rule: 'rgb(47, 64, 69)',
  },
} as const;

describe('配色', () => {
  test.each(['light', 'dark'] as const)('[#17-1] %s 模式的文章頁底色、文字、標題、連結、表格線和導入前相同', async (theme) => {
    const { style, close } = await openFrame('knowledge/03-products-comparison/', { theme });
    try {
      expect({
        bg: style('body').backgroundColor,
        text: style('body').color,
        heading: style('.sl-markdown-content h2').color,
        link: style('.sl-markdown-content li > a').color,
        rule: style('.sl-markdown-content td').borderBottomColor,
      }).toEqual(EXPECTED[theme]);
      expect(style('body').fontFamily).toMatch(/^"Noto Sans TC"/);
    } finally {
      close();
    }
  });
});
