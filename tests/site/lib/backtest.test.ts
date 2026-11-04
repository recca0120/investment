// 網站回測器的計算（#41，決策 0008）：Python 是標準答案
// scripts/export_prices.py 用 Python 讀回同一份 JSON 算出 tests/site/fixtures/backtest-golden.json，
// 這裡用 TypeScript 算同樣的情境，結果必須一致
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { runDca, worstPaperLoss } from '../../../site/lib/backtest';
import { parseFxSeries, parseGolden, parsePriceSeries } from '../../../site/lib/schemas';
import goldenJson from '../fixtures/backtest-golden.json';

// 讀資料時一律經過共用格式驗證（#44）
const read = (name: string): unknown => JSON.parse(readFileSync(`public/data/prices/${name}.json`, 'utf8'));
const fx = parseFxSeries(read('USDTWD'));
const golden = parseGolden(goldenJson);

describe('網站回測器的計算和 Python 一致', () => {
  test('有標準答案可以比', () => {
    expect(golden.length).toBeGreaterThanOrEqual(8);
  });

  const label = ({ input: i }: (typeof golden)[number]) =>
    `${i.symbol} ${i.start}～${i.end} 每月 ${i.monthly}${i.dividends ? ' 含息' : ''}${i.twd ? ' 台幣' : ''}${i.tax ? ' 扣稅' : ''}`;

  test.each(golden.map((g) => [label(g), g] as const))(
    '[#41-2] %s',
    (_name, { input, expected }) => {
      const result = runDca(parsePriceSeries(read(input.symbol)), {
        monthly: input.monthly,
        start: input.start,
        end: input.end,
        dividends: input.dividends,
        tax: input.tax,
        fx: input.twd ? fx : undefined,
      });

      expect(result.history).toHaveLength(expected.days);
      expect(Math.abs(result.totalInvested - expected.totalInvested), '總投入').toBeLessThan(1);
      expect(Math.abs(result.finalValue - expected.finalValue), '期末市值').toBeLessThan(1);
      expect(Math.abs(result.annualized - expected.annualized), '年化報酬').toBeLessThan(0.0005);
      expect(Math.abs(result.maxDrawdown - expected.maxDrawdown), '最大跌幅').toBeLessThan(0.0005);

      const worst = worstPaperLoss(result);
      expect(worst.date).toBe(expected.worst.date);
      expect(Math.abs(worst.value - expected.worst.value), '最慘時的市值').toBeLessThan(1);
      expect(worst.recovered).toBe(expected.worst.recovered);
    },
  );
});

// 突變測試發現：只有真實資料的標準答案，邊界情況（匯率邊界、資料不足、剛好回本）沒有被鎖住
// 這些和 Python 的驗收測試對應，預期值手算
describe('小樣本（手算，和 Python 的驗收測試對應）', () => {
  const series = (dates: string[], close: number[], currency: 'TWD' | 'USD' = 'USD') => ({
    symbol: 'X', currency, dates, close, total: close,
  });

  test('[#41-2] 匯率用「當天或之前最近一天」，第一天的匯率也要用到', () => {
    // 1/2 匯率 30、1/3 沒有匯率（沿用 30）、2/3 匯率 32；價格 50 → 50 → 40
    const fx = { dates: ['2025-01-02', '2025-02-03'], toUsd: [30, 32], toTwd: [30, 32] };
    const r = runDca(series(['2025-01-02', '2025-01-03', '2025-02-03'], [50, 50, 40]), {
      monthly: 3000, start: '2025-01-01', end: '2025-02-28', dividends: true, tax: false, fx,
    });
    // 1 月：3000/30/50 = 2 股；1/3 市值 2 × 50 × 30 = 3,000；2 月：3000/32/40 = 2.34375 股
    // 期末 4.34375 × 40 × 32 = 5,560
    expect(r.history.map((h) => h.value)).toEqual([3000, 3000, 5560]);
  });

  test('[#41-2] 第一個交易日之前沒有匯率、期間內沒有價格，都要報錯', () => {
    const fx = { dates: ['2025-01-03'], toUsd: [30], toTwd: [30] };
    const opts = { monthly: 1000, start: '2025-01-01', end: '2025-01-31', dividends: true, tax: false, fx };
    expect(() => runDca(series(['2025-01-02', '2025-01-03'], [50, 50]), opts)).toThrow('2025-01-02 之前沒有匯率資料');
    expect(() => runDca(series(['2025-03-03'], [50]), opts)).toThrow('沒有價格資料');
  });

  test('[#41-2] 市值剛好等於投入的那天就算回到本金（和 Python 相同定義）', () => {
    // 1/2 價格 100 買 10 股 → 1/15 價格 80（少 200）→ 1/20 價格 100（市值剛好 1,000）
    const r = runDca(series(['2026-01-02', '2026-01-15', '2026-01-20'], [100, 80, 100], 'TWD'), {
      monthly: 1000, start: '2026-01-01', end: '2026-01-31', dividends: true, tax: false,
    });
    expect(worstPaperLoss(r)).toEqual({ date: '2026-01-15', invested: 1000, value: 800, recovered: '2026-01-20' });
  });
});
