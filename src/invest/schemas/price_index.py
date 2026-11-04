# 自動產生，不要手改：來源 site/lib/schemas.ts（zod）→ schemas/price-index.schema.json，執行 npm run schemas 重新產生

from __future__ import annotations

from datetime import date
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, RootModel, constr


class Currency(StrEnum):
    """
    幣別：台股 TWD、美股 USD
    """

    TWD = 'TWD'
    USD = 'USD'


class PriceIndexEntry(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    symbol: constr(min_length=1, strict=True)
    currency: Currency
    """
    幣別：台股 TWD、美股 USD
    """
    first: date
    """
    日期（YYYY-MM-DD）
    """
    last: date
    """
    日期（YYYY-MM-DD）
    """


class PriceIndex(BaseModel):
    """
    網站回測器的代號清單（public/data/prices/index.json）
    """

    model_config = ConfigDict(
        extra='forbid',
    )
    symbols: list[PriceIndexEntry]


class Model(RootModel[PriceIndex]):
    root: PriceIndex