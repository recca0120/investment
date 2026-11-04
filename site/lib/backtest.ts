/** 網站回測器的計算（#41，決策 0008）。Python（src/invest/backtest.py）是標準答案 */
export interface PriceSeries {
  symbol: string;
  currency: 'TWD' | 'USD';
  dates: string[];
  close: number[];
  total: number[];
  totalTaxed?: number[];
}
export interface FxSeries {
  dates: string[];
  toUsd: number[];
  toTwd: number[];
}
export interface DcaOptions {
  monthly: number;
  start: string;
  end: string;
  dividends: boolean;
  tax: boolean;
  fx?: FxSeries;
}
export interface ValuePoint {
  date: string;
  invested: number;
  value: number;
}
export interface DcaResult {
  symbol: string;
  totalInvested: number;
  finalValue: number;
  annualized: number;
  maxDrawdown: number;
  history: ValuePoint[];
}
export interface PaperLoss {
  date: string;
  invested: number;
  value: number;
  recovered: string | null;
}

const DAY = 86_400_000;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;

/** 每個交易日用「當天或之前最近一個」有匯率的日子（同 Python 的 _align_fx） */
function alignFx(fx: FxSeries, dates: string[]): { toUsd: number[]; toTwd: number[] } {
  const toUsd: number[] = [];
  const toTwd: number[] = [];
  let j = -1;
  for (const d of dates) {
    while (j + 1 < fx.dates.length && fx.dates[j + 1] <= d) j++;
    if (j < 0) throw new Error(`${d} 之前沒有匯率資料`);
    toUsd.push(fx.toUsd[j]);
    toTwd.push(fx.toTwd[j]);
  }
  return { toUsd, toTwd };
}

/** 不定期現金流的年化報酬率：讓淨現值為 0 的 r（365 天為一年，二分法；同 Python 的 xirr） */
export function xirr(flows: [string, number][]): number {
  const t0 = flows[0][0];
  const npv = (r: number) => flows.reduce((sum, [d, cf]) => sum + cf / (1 + r) ** (days(t0, d) / 365), 0);
  let lo = -0.9999;
  let hi = 100;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function maxDrawdown(series: number[]): number {
  let peak = series[0];
  let worst = 0;
  for (const v of series) {
    peak = Math.max(peak, v);
    worst = Math.max(worst, 1 - v / peak);
  }
  return worst;
}

/**
 * 每月第一個交易日投入固定金額（同 Python 的 run_dca＋compare_dca）
 * - dividends：用含息價；tax 只套用在美股（用 Python 算好的 totalTaxed）
 * - fx 只套用在美股：每月投入的是新台幣，以當日匯率換美元買進，市值換回新台幣
 */
export function runDca(series: PriceSeries, opts: DcaOptions): DcaResult {
  const idx = series.dates.flatMap((d, i) => (d >= opts.start && d <= opts.end ? [i] : []));
  if (idx.length === 0) throw new Error(`${series.symbol} 在 ${opts.start} ~ ${opts.end} 沒有價格資料`);
  const usd = series.currency === 'USD';
  const source = !opts.dividends
    ? series.close
    : opts.tax && usd && series.totalTaxed
      ? series.totalTaxed
      : series.total;
  const dates = idx.map((i) => series.dates[i]);
  const price = idx.map((i) => source[i]);
  const { toUsd, toTwd } =
    usd && opts.fx ? alignFx(opts.fx, dates) : { toUsd: dates.map(() => 1), toTwd: dates.map(() => 1) };

  let shares = 0;
  let invested = 0;
  let month = '';
  const flows: [string, number][] = [];
  const history: ValuePoint[] = [];
  dates.forEach((d, i) => {
    if (d.slice(0, 7) !== month) {
      month = d.slice(0, 7);
      shares += opts.monthly / toUsd[i] / price[i];
      invested += opts.monthly;
      flows.push([d, -opts.monthly]);
    }
    history.push({ date: d, invested, value: shares * price[i] * toTwd[i] });
  });

  const finalValue = history.at(-1)!.value;
  flows.push([dates.at(-1)!, finalValue]);
  return {
    symbol: series.symbol,
    totalInvested: invested,
    finalValue,
    annualized: xirr(flows),
    maxDrawdown: maxDrawdown(price.map((p, i) => p * toTwd[i])),
    history,
  };
}

/** 帳上最慘的時候：「市值 − 累計投入」最低的那一天，以及之後第一次回到本金的日期（同 Python 的 worst_paper_loss） */
export function worstPaperLoss(result: DcaResult): PaperLoss {
  const h = result.history;
  let i = 0;
  h.forEach((p, k) => {
    if (p.value - p.invested < h[i].value - h[i].invested) i = k;
  });
  const recovered = h.slice(i + 1).find((p) => p.value >= p.invested)?.date ?? null;
  return { date: h[i].date, invested: h[i].invested, value: h[i].value, recovered };
}
