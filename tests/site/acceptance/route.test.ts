// 驗收：「投資知識」的側欄是一條新手路線（#22，決策 0006）
import { within } from '@testing-library/dom';
import { expect, test } from 'vitest';
import { openPage } from '../support/dist';
import { publishedDocs } from '../support/docs';

// 路線順序：選好方案就動手（開始行動），再看結果（回測）；資料來源與系統規劃是進階內容放最後
// 一站可以拆成好幾頁（例如美股：① 選管道、② 稅務），那一站底下列出各頁
type Station = string | { title: string; parts: { slug: string; label: string }[] };
const ROUTE: Station[] = [
  '01-getting-started',
  '02-recommended-methods',
  '03-products-comparison',
  '04-starter-plans',
  '09-getting-started-actions',
  '07-dca-backtest-2016-2026',
  '10-bad-luck-scenarios',
  {
    title: '美股投資管道與稅務',
    parts: [
      { slug: '08-us-stock-channels-tax', label: '① 選管道' },
      { slug: '08-us-stock-tax', label: '② 稅務' },
    ],
  },
  '06-data-sources',
  '05-system-design',
];

const slugs = ROUTE.flatMap((s) => (typeof s === 'string' ? [s] : s.parts.map((p) => p.slug)));
/** 使用者（含螢幕閱讀器）讀到的文字：去掉 aria-hidden 的裝飾（硬幣裡的站號） */
const clean = (el: Element) => {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return copy.textContent!.replace(/\s+/g, ' ').trim();
};

test('[#22-8] 知識文章的側欄排成路線：依序有站號，目前這一站有標示', () => {
  const docs = new Map(publishedDocs('knowledge').map((d) => [d.slug, d]));
  expect([...docs.keys()].sort(), '路線要包含每一篇知識文章').toEqual([...slugs].sort());

  const here = docs.get('07-dca-backtest-2016-2026')!;
  const sidebar = within(openPage(here.path).screen.getByRole('navigation', { name: '主要' }));
  const list = sidebar.getByRole('list', { name: '新手路線' }); // 手機版側欄還有分區連結，只看路線
  const stations = [...list.children];
  expect(stations).toHaveLength(ROUTE.length);

  ROUTE.forEach((station, i) => {
    const li = stations[i];
    if (typeof station === 'string') {
      expect(clean(li.querySelector('a')!), `第 ${i + 1} 站`).toBe(`${i + 1} ${docs.get(station)!.title}`);
    } else {
      expect(clean(li), `第 ${i + 1} 站`).toMatch(new RegExp(`^${i + 1} ${station.title}`));
      const parts = within(li as HTMLElement).getAllByRole('link');
      expect(parts.map(clean)).toEqual(station.parts.map((p) => p.label));
      expect(parts.map((a) => a.getAttribute('href'))).toEqual(
        station.parts.map((p) => `/investment/knowledge/${p.slug}/`),
      );
    }
  });
  expect(within(list).getByRole('link', { name: new RegExp(here.title) })).toHaveAttribute('aria-current', 'page');
});

test('[#36-3] 讀完定期定額回測，下一篇就是「運氣不好時會怎樣」', () => {
  const next = openPage('knowledge/07-dca-backtest-2016-2026/').document.querySelector('a[rel="next"]');
  expect(next?.getAttribute('href')).toBe('/investment/knowledge/10-bad-luck-scenarios/');
});
