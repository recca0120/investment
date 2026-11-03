"""價格資料的介面（Protocol）與資料型別。use case 只依賴這裡，不依賴 FinMind 等具體來源。"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Protocol


@dataclass(frozen=True, order=True)
class PricePoint:
    date: date
    close: float  # 只調整股票分割的收盤價
    total_return: float  # 含息還原價（股利再投入）


class UnknownSymbolError(KeyError):
    """查不到的代號。"""


class PriceSource(Protocol):
    def daily(self, symbol: str, start: date, end: date) -> list[PricePoint]: ...
