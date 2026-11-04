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
