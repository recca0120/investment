// 網站上的回測器（#41，決策 0008）：在真實瀏覽器裡填表、按「開始回測」
// 預期值來自標準答案（Python 算的，tests/site/fixtures/backtest-golden.json）
import { describe, expect, test } from 'vitest';
import golden from '../fixtures/backtest-golden.json';
import { MOBILE, openFrame } from './frame';

const PAGE = 'tools/backtest/';
// 運氣不好的情境：0050、每月 3,000、2021-12-01 ～ 2026-10-31
const CASE = golden.find((g) => g.input.symbol === '0050' && g.input.start === '2021-12-01')!;

type Frame = Awaited<ReturnType<typeof openFrame>>;

async function runBacktest(page: Frame) {
  const { doc } = page;
  const set = (label: string, value: string) => {
    const el = [...doc.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')].find(
      (e) => e.labels?.[0]?.textContent?.trim().startsWith(label),
    );
    expect(el, `找不到「${label}」欄位`).toBeDefined();
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = value === 'true';
    else el!.value = value;
    el!.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set('代號', CASE.input.symbol);
  set('每月投入', String(CASE.input.monthly));
  set('開始', CASE.input.start);
  set('結束', CASE.input.end);
  set('含息', String(CASE.input.dividends));
  const button = [...doc.querySelectorAll('button')].find((b) => b.textContent?.trim() === '開始回測');
  expect(button, '找不到「開始回測」按鈕').toBeDefined();
  button!.click();
  // 等結果出現（要下載價格 JSON）
  for (let i = 0; i < 100 && !doc.querySelector('[data-backtest-result] table'); i++) await new Promise((r) => setTimeout(r, 50));
  const result = doc.querySelector('[data-backtest-result]');
  expect(result?.querySelector('table'), '按下開始回測後沒有出現結果表').toBeTruthy();
  return result!;
}

const money = (v: number) => Math.round(v).toLocaleString('zh-TW');
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

describe('網站回測器', () => {
  test('[#41-3] 填好代號、每月金額、期間，按「開始回測」後顯示總投入、期末市值、總報酬、年化報酬、最大跌幅', async () => {
    const page = await openFrame(PAGE);
    try {
      const result = await runBacktest(page);
      const cells = [...result.querySelectorAll('tbody td')].map((td) => td.textContent!.trim());
      const e = CASE.expected;
      expect(cells).toEqual([
        CASE.input.symbol,
        money(e.totalInvested),
        money(e.finalValue),
        pct(e.finalValue / e.totalInvested - 1),
        pct(e.annualized),
        pct(e.maxDrawdown),
      ]);
    } finally {
      page.close();
    }
  });

  test('[#41-4] 報酬率走勢圖有 0% 基準線、標出帳上最慘的時候，並用文字寫出少多少、哪天回本', async () => {
    const page = await openFrame(PAGE);
    try {
      const result = await runBacktest(page);
      const chart = result.querySelector('figure svg');
      expect(chart, '找不到報酬率走勢圖').toBeTruthy();
      expect(chart!.querySelector('[aria-label="rule"]'), '0% 基準線').toBeTruthy();
      expect(chart!.querySelector('[aria-label="line"]'), '報酬率線').toBeTruthy();
      expect(chart!.querySelector('[aria-label="dot"] circle'), '最慘的點').toBeTruthy();

      const w = CASE.expected.worst;
      expect(result.textContent).toContain(
        `最慘 ${w.date}，投入 ${money(w.invested)}，市值 ${money(w.value)}，少 ${money(w.invested - w.value)} 元（${pct(w.value / w.invested - 1)}），${w.recovered} 回到本金`,
      );
    } finally {
      page.close();
    }
  });

  test('[#41-3] 選台股時不顯示美股才有的選項（匯率、預扣稅），選美股時才顯示', async () => {
    const page = await openFrame(PAGE);
    try {
      const symbol = page.doc.querySelector<HTMLSelectElement>('select[name="symbol"]')!;
      const visible = (name: string) => {
        const label = page.doc.querySelector(`input[name="${name}"]`)!.closest('label')!;
        return page.doc.defaultView!.getComputedStyle(label).display !== 'none';
      };
      for (const [code, usd] of [['0050', false], ['VT', true]] as const) {
        symbol.value = code;
        symbol.dispatchEvent(new Event('change', { bubbles: true }));
        expect(visible('twd'), `${code} 的換算新台幣選項`).toBe(usd);
        expect(visible('tax'), `${code} 的預扣稅選項`).toBe(usd);
      }
    } finally {
      page.close();
    }
  });

  test('[#41-5] 手機 375px 可以操作，跑完回測頁面也不會水平捲動', async () => {
    const page = await openFrame(PAGE, { size: MOBILE });
    try {
      await runBacktest(page);
      const { scrollWidth, clientWidth } = page.doc.documentElement;
      expect(scrollWidth, `頁面寬 ${scrollWidth}px 超出畫面 ${clientWidth}px`).toBeLessThanOrEqual(clientWidth);
    } finally {
      page.close();
    }
  });
});
