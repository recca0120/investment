from dataclasses import dataclass
from datetime import date
from typing import Protocol


class PriceSource(Protocol):
    def monthly_first_close(self, symbol: str, start: date, end: date) -> list[tuple[date, float]]: ...


@dataclass(frozen=True)
class DcaResult:
    total_invested: float
    shares: float
    final_value: float
    return_rate: float
    max_drawdown: float


def run_dca(prices: PriceSource, symbol: str, *, monthly_amount: float, start: date, end: date) -> DcaResult:
    rows = prices.monthly_first_close(symbol, start, end)
    shares = 0.0
    invested = 0.0
    peak = 0.0
    max_dd = 0.0
    for _, price in rows:
        # 先用買入前的持股算當月市值，才能反映價格下跌（買入當下會稀釋跌幅）
        value_before_buy = shares * price
        if peak > 0:
            max_dd = max(max_dd, 1 - value_before_buy / peak)
        shares += monthly_amount / price
        invested += monthly_amount
        peak = max(peak, shares * price)
    final_value = shares * rows[-1][1] if rows else 0.0
    return DcaResult(
        total_invested=invested,
        shares=shares,
        final_value=final_value,
        return_rate=final_value / invested - 1 if invested else 0.0,
        max_drawdown=max_dd,
    )
