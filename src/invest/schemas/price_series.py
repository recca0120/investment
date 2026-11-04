# 自動產生，不要手改：來源 site/lib/schemas.ts（zod）→ schemas/price-series.schema.json，執行 npm run schemas 重新產生

from __future__ import annotations

from datetime import date
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, RootModel, constr


class Currency(StrEnum):
    """
    幣別：台股 TWD、美股 USD
    """

    TWD = 'TWD'
    USD = 'USD'


class Date(RootModel[date]):
    root: date
    """
    日期（YYYY-MM-DD）
    """


class PriceSeries(BaseModel):
    """
    一檔的價格資料（public/data/prices/<代號>.json）
    """

    model_config = ConfigDict(
        extra='forbid',
    )
    symbol: constr(min_length=1)
    """
    代號，例如 0050、VT
    """
    currency: Currency
    """
    幣別：台股 TWD、美股 USD
    """
    dates: list[Date] = Field(..., min_length=1)
    """
    交易日（由舊到新）
    """
    close: list[float]
    """
    只調整股票分割的收盤價
    """
    total: list[float]
    """
    含息還原價（股利再投入）
    """
    totalTaxed: list[float] | None = None
    """
    美股：股利扣 30% 預扣稅後的含息價
    """


class Model(RootModel[PriceSeries]):
    root: PriceSeries