"""假的價格來源：取代 FinMind，讓測試快速、可重複、不連網。"""
from datetime import date

from invest.prices import FxRate, PricePoint, UnknownSymbolError


class FakePriceSource:
    """symbol → [(日期, 收盤價) 或 (日期, 收盤價, 含息還原價)]；沒給還原價時等於收盤價。"""

    def __init__(self, prices: dict[str, list[tuple]]):
        self._prices = {
            symbol: [PricePoint(r[0], r[1], r[2] if len(r) > 2 else r[1]) for r in rows]
            for symbol, rows in prices.items()
        }

    def daily(self, symbol: str, start: date, end: date) -> list[PricePoint]:
        # 和真實來源相同的前置條件：查不到代號要報錯，不能默默回傳空串列
        if symbol not in self._prices:
            raise UnknownSymbolError(symbol)
        return sorted(p for p in self._prices[symbol] if start <= p.date <= end)


class FakeFxSource:
    """固定的美元匯率清單，取代 FinMind 的 TaiwanExchangeRate。"""

    def __init__(self, rates: list[FxRate]):
        self._rates = sorted(rates)

    def usd_twd(self, start: date, end: date) -> list[FxRate]:
        return [r for r in self._rates if start <= r.date <= end]
