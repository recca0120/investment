// 驗收：文章 07 先給可比較的結論（#53）。讀 dist 的 HTML，數字和回測器標準答案比對
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { openPage } from '../support/dist';

type Golden = { input: { symbol: string; monthly: number; start: string; end: string; dividends: boolean; twd?: boolean; tax?: boolean }; expected: { finalValue: number; annualized: number; maxDrawdown: number } }[];
const golden: Golden = JSON.parse(readFileSync('tests/site/fixtures/backtest-golden.json', 'utf8'));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const money = (x: number) => Math.round(x).toLocaleString('en-US');

/** 三檔可以直接比較的算法：新台幣、含息；VT 扣 30% 股利預扣稅 */
const comparable = (symbol: string) =>
  golden.find(
    ({ input }) =>
      input.symbol === symbol &&
      input.monthly === 5000 &&
      input.start === '2016-01-01' &&
      input.end === '2026-10-31' &&
      input.dividends &&
      input.twd &&
      input.tax,
  )!.expected;

/** 「重點」的每一點（PageTitle.astro：aria-labelledby="page-summary"） */
const summaryOf = (document: Document) =>
  [...document.querySelectorAll('[aria-labelledby="page-summary"] li')].map((li) => li.textContent!.trim());

const PAGE = 'knowledge/07-dca-backtest-2016-2026/';

/** 「結果」這一節的第一張表（不在分頁裡） */
function firstResultTable(document: Document) {
  const heading = [...document.querySelectorAll('.sl-markdown-content h2')].find((h) => h.textContent!.includes('結果'));
  expect(heading, '要有「結果」一節').toBeDefined();
  let node = heading!.closest('.sl-heading-wrapper') ?? heading!;
  while ((node = node.nextElementSibling!) && !node.querySelector('table') && node.tagName !== 'TABLE') {
    expect(node.matches('.sl-heading-wrapper, h2'), '「結果」一節的第一張表之前不能先換到下一節').toBe(false);
  }
  const table = node.tagName === 'TABLE' ? node : node.querySelector('table')!;
  expect(table.closest('starlight-tabs'), '第一張表不能藏在分頁裡').toBeNull();
  return table;
}

describe('文章 07', () => {
  test('[#53-1] 「結果」第一張表是三檔可以直接比較的數字，和「重點」一致', () => {
    const { document } = openPage(PAGE);
    const rows = [...firstResultTable(document).querySelectorAll('tbody tr')].map((tr) => tr.textContent!);
    expect(rows).toHaveLength(3);
    const summary = summaryOf(document).join('\n');
    for (const [i, symbol] of ['0050', '006208', 'VT'].entries()) {
      expect(rows[i]).toContain(symbol);
      expect(rows[i]).toContain(pct(comparable(symbol).annualized));
    }
    expect(summary).toContain(pct(comparable('0050').annualized));
    expect(summary).toContain(pct(comparable('VT').annualized));
  });

  test('[#53-2] 第一張表的期末市值、年化報酬、最大跌幅都和標準答案一致', () => {
    const { document } = openPage(PAGE);
    const rows = [...firstResultTable(document).querySelectorAll('tbody tr')];
    for (const [i, symbol] of ['0050', '006208', 'VT'].entries()) {
      const want = comparable(symbol);
      const text = rows[i].textContent!;
      expect(text, symbol).toContain(money(want.finalValue));
      expect(text, symbol).toContain(pct(want.annualized));
      expect(text, symbol).toContain(pct(want.maxDrawdown));
    }
  });

  test('[#53-3] 不點分頁也看得到「重點」裡的每一個數字', () => {
    const { document } = openPage(PAGE);
    const summaryItems = summaryOf(document).filter((t) => /\d/.test(t));
    expect(summaryItems.length, '找不到「重點」').toBeGreaterThan(0);
    // 移除沒選到的分頁（第 2 個以後的 tabpanel）後的內文
    const content = document.querySelector('.sl-markdown-content')!.cloneNode(true) as Element;
    content.querySelectorAll('starlight-tabs').forEach((tabs) =>
      [...tabs.querySelectorAll('[role="tabpanel"]')].slice(1).forEach((p) => p.remove()),
    );
    const visible = content.textContent!;
    const numbers = summaryItems.flatMap((t) => t.match(/\d+(\.\d+)?%|\d+(\.\d+)? 個百分點/g) ?? []);
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) expect(visible, `「${n}」只在分頁裡或沒出現`).toContain(n.replace(/ 個百分點/, ''));
  });
});
