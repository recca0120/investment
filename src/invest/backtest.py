"""定期定額回測（issue #5）"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from invest.prices import PricePoint, PriceSource


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
) -> DcaResult:
    """每月第一個交易日投入固定金額。include_dividends=True 用含息還原價（股利再投入）。"""
    points = prices.daily(symbol, start, end)
    if not points:
        raise ValueError(f"{symbol} 在 {start} ~ {end} 沒有價格資料")

    def price(p: PricePoint) -> float:
        return p.total_return if include_dividends else p.close

    buy_dates = {p.date for p in _first_trading_day_of_each_month(points)}
    shares = invested = 0.0
    flows: list[tuple[date, float]] = []
    history = []
    for p in points:
        if p.date in buy_dates:
            shares += monthly_amount / price(p)
            invested += monthly_amount
            flows.append((p.date, -monthly_amount))
        history.append(ValuePoint(p.date, invested, shares * price(p)))

    final_value = history[-1].value
    flows.append((points[-1].date, final_value))
    return DcaResult(
        symbol=symbol,
        total_invested=invested,
        final_value=final_value,
        annualized_return=xirr(flows),
        max_drawdown=_max_drawdown([price(p) for p in points]),
        history=tuple(history),
    )


def compare_dca(
    prices: PriceSource,
    symbols: list[str],
    *,
    monthly_amount: float,
    start: date,
    end: date,
    include_dividends: bool = True,
) -> list[DcaResult]:
    return [
        run_dca(prices, s, monthly_amount=monthly_amount, start=start, end=end, include_dividends=include_dividends)
        for s in symbols
    ]


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
