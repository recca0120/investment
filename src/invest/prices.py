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


@dataclass(frozen=True, order=True)
class FxRate:
    """美元兌新台幣的匯率（issue #12）"""

    date: date
    to_usd: float  # 買 1 美元要付的新台幣（銀行即期賣出價）
    to_twd: float  # 賣 1 美元拿回的新台幣（銀行即期買入價）


class UnknownSymbolError(KeyError):
    """查不到的代號。"""


class PriceSource(Protocol):
    def daily(self, symbol: str, start: date, end: date) -> list[PricePoint]: ...


class FxSource(Protocol):
    def usd_twd(self, start: date, end: date) -> list[FxRate]: ...


def currency(symbol: str) -> str:
    """台股代號以數字開頭（0050、2330），其餘視為美股。"""
    return "TWD" if symbol[:1].isdigit() else "USD"
