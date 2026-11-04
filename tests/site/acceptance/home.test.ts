// 驗收：build 出來的首頁（#19、#22）。元件測試用 props 傳資料，這裡確認頁面實際接上真實資料與網站 base
import { within } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import passbook from '../../../site/data/passbook.json';
import { existsInDist, openPage } from '../support/dist';
import { SECTIONS, publishedDocs } from '../support/docs';

/** 使用者讀到的文字：去掉 aria-hidden 的裝飾（硬幣裡的站號） */
const clean = (el: Element) => {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return copy.textContent!.replace(/\s+/g, ' ').trim();
};
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

test('首頁的撲滿用真實回測結果', () => {
  const { screen } = openPage('');
  const figure = within(screen.getByRole('figure', { name: new RegExp(`${passbook.symbol} 定期定額撲滿`) }));
  const final = passbook.final.toLocaleString('zh-TW');
  expect(figure.getAllByRole('row').at(-1)).toHaveTextContent(final);
  expect(figure.getByText(/現在變成/).closest('p')).toHaveTextContent(`現在變成 ${final} 元`);
  expect(figure.getByRole('link', { name: '看完整回測' })).toHaveAttribute('href', '/investment/knowledge/07-dca-backtest-2016-2026/');
});

describe('首頁', () => {
  test('[#22-11] 首頁的新手路線和知識區側欄同一條路線（從文章自動產生，新增文章自動多一站）', () => {
    const home = within(openPage('').screen.getByRole('region', { name: '新手路線' }));
    const stations = [...home.getAllByRole('list')[0].children]; // 最外層清單的每一項是一站（拆頁的站裡面還有子清單）

    const sidebar = openPage('knowledge/01-getting-started/').screen.getByRole('navigation', { name: '主要' });
    const route = [...within(sidebar).getByRole('list', { name: '新手路線' }).children];

    expect(stations.length).toBe(route.length);
    stations.forEach((li, i) => {
      const name = clean(route[i]).replace(/^\d+\s*/, '').split(/[①②③]/)[0].trim();
      expect(clean(li), `第 ${i + 1} 站`).toContain(name);
      expect(li.querySelector('a')!.getAttribute('href')).toBe(route[i].querySelector('a')!.getAttribute('href'));
    });
    expect(home.getByRole('link', { name: /從第 1 站開始/ })).toHaveAttribute('href', '/investment/knowledge/01-getting-started/');
  });

  test('[#22-6] 回測的關鍵數字來自回測資料', () => {
    const stats = within(openPage('').screen.getByRole('region', { name: '回測的關鍵數字' }));
    expect(stats.getByText(pct(passbook.annualized))).toBeInTheDocument();
    expect(stats.getByText(pct(passbook.maxDrawdown))).toBeInTheDocument();
    expect(stats.getByText(new RegExp(Math.round(passbook.final / 10000).toLocaleString('zh-TW')))).toBeInTheDocument();
  });

  test('[#22-6] 網站分區的入口卡片標示各區篇數', () => {
    const cards = within(openPage('').screen.getByRole('region', { name: '網站分區' }));
    for (const { dir, label } of SECTIONS) {
      const link = cards.getByRole('link', { name: new RegExp(label) });
      expect(link, label).toHaveTextContent(`${publishedDocs(dir).length} 篇`);
      expect(link.getAttribute('href')).toMatch(new RegExp(`^/investment/${dir}/`));
    }
  });

  test('[#22-6] 最近更新列出最近改過的文章，日期新的在前', () => {
    const recent = within(openPage('').screen.getByRole('region', { name: '最近更新' }));
    const items = recent.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(6);
    const dates = items.map((li) => li.querySelector('time')!.getAttribute('datetime')!);
    expect(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
    expect([...dates].sort().reverse()).toEqual(dates);
    for (const li of items) expect(existsInDist(li.querySelector('a')!.getAttribute('href')!)).toBe(true);
  });

  test('[#22-6] 首頁不顯示「編輯頁面」', () => {
    expect(openPage('').screen.queryByRole('link', { name: /編輯頁面/ })).toBeNull();
  });
});
