"""假的價格來源：取代真實 API，讓測試快速、可重複、不連網。"""
from datetime import date


class FakePriceSource:
    def __init__(self, prices: dict[str, dict[date, float]]):
        self._prices = prices

    def monthly_first_close(self, symbol: str, start: date, end: date) -> list[tuple[date, float]]:
        # 和真實來源一樣的前置條件：查不到代號要報錯，不能默默回傳空值
        if symbol not in self._prices:
            raise KeyError(f"unknown symbol: {symbol}")
        return sorted((d, p) for d, p in self._prices[symbol].items() if start <= d <= end)
