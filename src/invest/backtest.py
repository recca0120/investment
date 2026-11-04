"""定期定額回測（issue #5）；換算新台幣與美股股利預扣稅（issue #12）"""
from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass
from datetime import date, timedelta

from invest.prices import FxRate, FxSource, PricePoint, PriceSource, currency


@dataclass(frozen=True)
class ValuePoint:
    date: date
    invested: float
    value: float


@dataclass(frozen=True)
class DcaResult:
    symbol: str
    total_invested: float
    final_value: float
    annualized_return: float  # 資金加權報酬率（XIRR）
    max_drawdown: float  # 持有期間每日價格的時間加權最大跌幅
    history: tuple[ValuePoint, ...]  # 每個交易日的累計投入與市值，畫圖用

    @property
    def total_return(self) -> float:
        return self.final_value / self.total_invested - 1


def run_dca(
    prices: PriceSource,
    symbol: str,
    *,
    monthly_amount: float,
    start: date,
    end: date,
    include_dividends: bool = True,
    fx: list[FxRate] | None = None,
    dividend_tax: float = 0.0,
) -> DcaResult:
    """每月第一個交易日投入固定金額。

    - include_dividends：用含息還原價（股利再投入）
    - dividend_tax：股利被預扣的比例（美股對外國人 30%），只有扣稅後的股利再投入
    - fx：給了就把 monthly_amount 當成新台幣，以當日匯率換美元買進，市值以當日匯率換回新台幣
    """
    points = prices.daily(symbol, start, end)
    if not points:
        raise ValueError(f"{symbol} 在 {start} ~ {end} 沒有價格資料")

    if not include_dividends:
        price = [p.close for p in points]
    elif dividend_tax:
        price = _after_dividend_tax(points, dividend_tax)
    else:
        price = [p.total_return for p in points]
    to_usd, to_twd = _align_fx(fx, [p.date for p in points]) if fx is not None else ([1.0] * len(points),) * 2

    buy_dates = {p.date for p in _first_trading_day_of_each_month(points)}
    shares = invested = 0.0
    flows: list[tuple[date, float]] = []
    history = []
    for i, p in enumerate(points):
        if p.date in buy_dates:
            shares += monthly_amount / to_usd[i] / price[i]
            invested += monthly_amount
            flows.append((p.date, -monthly_amount))
        history.append(ValuePoint(p.date, invested, shares * price[i] * to_twd[i]))

    final_value = history[-1].value
    flows.append((points[-1].date, final_value))
    return DcaResult(
        symbol=symbol,
        total_invested=invested,
        final_value=final_value,
        annualized_return=xirr(flows),
        max_drawdown=_max_drawdown([price[i] * to_twd[i] for i in range(len(points))]),
        history=tuple(history),
    )


def _after_dividend_tax(points: list[PricePoint], tax: float) -> list[float]:
    """從收盤價與含息還原價反推每次除息，改成只有 (1 - tax) 的股利再投入。

    還原價／收盤價的比值 a 只在除息日改變：a[i-1] / a[i] = 1 - 股利 / 前一日收盤。
    扣稅後的調整因子 = 1 - (1 - tax) × 股利 / 前一日收盤，由新到舊累乘（以最後一天為基準）。
    美股資料沒有股利事件，只有 Adj_Close，所以用這個方法；台股的還原價也是同樣定義，結果一致。
    """
    ratio = [p.total_return / p.close for p in points]
    adjusted = [0.0] * len(points)
    adjusted[-1] = ratio[-1]
    for i in range(len(points) - 1, 0, -1):
        dividend_yield = 1 - ratio[i - 1] / ratio[i]
        adjusted[i - 1] = adjusted[i] * (1 - (1 - tax) * dividend_yield)
    return [p.close * a for p, a in zip(points, adjusted)]


def _align_fx(fx: list[FxRate], dates: list[date]) -> tuple[list[float], list[float]]:
    """每個交易日用「當天或之前最近一個」有匯率的日子（台灣放假、美股開盤時沒有匯率）。"""
    rates = sorted(fx)
    keys = [r.date for r in rates]
    to_usd, to_twd = [], []
    for d in dates:
        i = bisect_right(keys, d)
        if i == 0:
            raise ValueError(f"{d} 之前沒有匯率資料")
        to_usd.append(rates[i - 1].to_usd)
        to_twd.append(rates[i - 1].to_twd)
    return to_usd, to_twd


@dataclass(frozen=True)
class PaperLoss:
    """帳上最慘的時候（issue #36）"""

    date: date
    invested: float
    value: float
    recovered: date | None  # 之後第一次回到本金以上的日期；還沒回本是 None

    @property
    def loss(self) -> float:
        return self.value - self.invested

    @property
    def loss_ratio(self) -> float:
        return self.loss / self.invested


def worst_paper_loss(result: DcaResult) -> PaperLoss:
    """持有期間「市值 − 累計投入」最低的那一天，以及之後第一次回到本金的日期。

    看的是金額不是價格：定期定額每月都在投入，股價跌 50% 時帳上不一定少 50%。
    """
    history = result.history
    i = min(range(len(history)), key=lambda k: history[k].value - history[k].invested)
    worst = history[i]
    recovered = next((p.date for p in history[i + 1 :] if p.value >= p.invested), None)
    return PaperLoss(worst.date, worst.invested, worst.value, recovered)


def compare_dca(
    prices: PriceSource,
    symbols: list[str],
    *,
    monthly_amount: float,
    start: date,
    end: date,
    include_dividends: bool = True,
    fx: FxSource | None = None,
    us_dividend_tax: float = 0.0,
) -> list[DcaResult]:
    """多個標的一起比較。給了 fx 時美股換算新台幣；us_dividend_tax 只套用在美股。"""
    rates = None
    if fx is not None and any(currency(s) == "USD" for s in symbols):
        # 往前多抓一個月：開始日剛好是台灣假日時，要用前一個營業日的匯率
        rates = fx.usd_twd(start - timedelta(days=31), end)
    results = []
    for s in symbols:
        usd = currency(s) == "USD"
        results.append(run_dca(
            prices, s, monthly_amount=monthly_amount, start=start, end=end, include_dividends=include_dividends,
            fx=rates if usd else None, dividend_tax=us_dividend_tax if usd else 0.0,
        ))
    return results


def _max_drawdown(series: list[float]) -> float:
    peak, worst = series[0], 0.0
    for v in series:
        peak = max(peak, v)
        worst = max(worst, 1 - v / peak)
    return worst


def _first_trading_day_of_each_month(points: list[PricePoint]) -> list[PricePoint]:
    seen: set[tuple[int, int]] = set()
    picked = []
    for p in points:
        if (key := (p.date.year, p.date.month)) not in seen:
            seen.add(key)
            picked.append(p)
    return picked


def xirr(flows: list[tuple[date, float]]) -> float:
    """不定期現金流的年化報酬率：找出讓淨現值為 0 的 r（以 365 天為一年，二分法求解）。"""
    t0 = flows[0][0]

    def npv(r: float) -> float:
        return sum(cf / (1 + r) ** ((d - t0).days / 365) for d, cf in flows)

    lo, hi = -0.9999, 100.0
    for _ in range(200):
        mid = (lo + hi) / 2
        # 投入為負、取回為正：r 越大淨現值越小
        if npv(mid) > 0:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
