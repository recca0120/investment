// 驗收：整個網站的站內連結（取代原本的 scripts/check-site-links.py）
import { describe, expect, test } from 'vitest';
import { BASE, allPages, existsInDist, openPage } from '../support/dist';

const pages = allPages();

/** 每一頁 <main> 內容區與側欄裡的連結 href */
function linksOf(path: string) {
  const { document } = openPage(path);
  return [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!);
}

describe('站內連結', () => {
  test('網站至少有首頁和每一篇文章', () => {
    expect(pages).toContain('');
    expect(pages).toContain('knowledge/01-getting-started/');
  });

  test('[#15-2] 每個站內連結都指向存在的頁面，沒有殘留未轉換的 .md 連結', () => {
    const broken: string[] = [];
    const leftoverMd: string[] = [];
    for (const page of pages) {
      for (const href of linksOf(page)) {
        if (href.startsWith(BASE)) {
          if (!existsInDist(href)) broken.push(`${page || '首頁'} → ${href}`);
        } else if (!/^([a-z]+:|#|\/)/.test(href) && /\.mdx?(#|$)/.test(href)) {
          leftoverMd.push(`${page || '首頁'} → ${href}`);
        }
      }
    }
    expect(broken, '指向不存在的頁面').toEqual([]);
    expect(leftoverMd, '未轉換的 .md 相對連結').toEqual([]);
  });
});
