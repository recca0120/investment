"""把價格與匯率匯出成網站回測器用的 JSON（issue #41，決策 0008）

股利、分割、預扣稅的調整都在這裡（Python）做完，瀏覽器只做定期定額的計算。
定期定額的報酬不受價格乘上常數影響，所以匯出完整歷史後，瀏覽器取任一段期間計算，結果和 Python 只抓那段期間一樣。
"""
from __future__ import annotations

from datetime import date

from invest.backtest import US_DIVIDEND_TAX, after_dividend_tax
from invest.prices import FxRate, FxSource, PricePoint, PriceSource, UnknownSymbolError, currency


def export_series(prices: PriceSource, symbol: str, start: date, end: date) -> dict:
    """一檔的欄位式資料：dates、close（只調整分割）、total（含息還原價）；美股另有 totalTaxed（股利扣 30%）。"""
    points = prices.daily(symbol, start, end)
    out = {
        "symbol": symbol,
        "currency": currency(symbol),
        "dates": [p.date.isoformat() for p in points],
        # 四捨五入到 4 位小數：檔案小一半以上，對回測結果的影響遠小於 1 元
        "close": [round(p.close, 4) for p in points],
        "total": [round(p.total_return, 4) for p in points],
    }
    if out["currency"] == "USD":
        out["totalTaxed"] = [round(v, 4) for v in after_dividend_tax(points, US_DIVIDEND_TAX)]
    return out


def export_fx(fx: FxSource, start: date, end: date) -> dict:
    """美元匯率：toUsd 是買美元的價格（銀行即期賣出），toTwd 是換回新台幣的價格（即期買入）。"""
    rates = fx.usd_twd(start, end)
    return {
        "dates": [r.date.isoformat() for r in rates],
        "toUsd": [r.to_usd for r in rates],
        "toTwd": [r.to_twd for r in rates],
    }


class JsonPriceSource:
    """讀回匯出的 JSON（產生網站回測器的標準答案時用：Python 和瀏覽器吃同一份資料）。"""

    def __init__(self, series: dict[str, dict]):
        self._series = series

    def daily(self, symbol: str, start: date, end: date) -> list[PricePoint]:
        if symbol not in self._series:
            raise UnknownSymbolError(symbol)
        s = self._series[symbol]
        return [
            PricePoint(d, c, t)
            for d, c, t in zip(map(date.fromisoformat, s["dates"]), s["close"], s["total"])
            if start <= d <= end
        ]


class JsonFxSource:
    def __init__(self, fx: dict):
        self._rates = [FxRate(date.fromisoformat(d), u, t) for d, u, t in zip(fx["dates"], fx["toUsd"], fx["toTwd"])]

    def usd_twd(self, start: date, end: date) -> list[FxRate]:
        return [r for r in self._rates if start <= r.date <= end]
