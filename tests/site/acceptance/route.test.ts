// 驗收：「投資知識」的側欄是一條新手路線（#22，決策 0006）
import { within } from '@testing-library/dom';
import { expect, test } from 'vitest';
import { openPage } from '../support/dist';
import { publishedDocs } from '../support/docs';

// 路線順序：選好方案就動手（開始行動），再看結果（回測）；資料來源與系統規劃是進階內容放最後
const ROUTE = [
  '01-getting-started',
  '02-recommended-methods',
  '03-products-comparison',
  '04-starter-plans',
  '09-getting-started-actions',
  '07-dca-backtest-2016-2026',
  '08-us-stock-channels-tax',
  '06-data-sources',
  '05-system-design',
];

test('[#22-8] 知識文章的側欄排成路線：依序有站號，目前這一站有標示', () => {
  const docs = new Map(publishedDocs('knowledge').map((d) => [d.slug, d]));
  expect([...docs.keys()].sort(), '路線要包含每一篇知識文章').toEqual([...ROUTE].sort());

  const here = docs.get('07-dca-backtest-2016-2026')!;
  const sidebar = within(openPage(here.path).screen.getByRole('navigation', { name: '主要' }));
  const nav = within(sidebar.getByRole('list', { name: '新手路線' })); // 手機版側欄還有分區連結，只看路線
  const stations = nav.getAllByRole('link').map((a) => a.textContent!.replace(/\s+/g, ' ').trim());

  expect(stations).toEqual(ROUTE.map((slug, i) => `${i + 1} ${docs.get(slug)!.title}`));
  expect(nav.getByRole('link', { name: new RegExp(here.title) })).toHaveAttribute('aria-current', 'page');
});
