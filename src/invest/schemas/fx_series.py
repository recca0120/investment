# 自動產生，不要手改：來源 site/lib/schemas.ts（zod）→ schemas/fx-series.schema.json，執行 npm run schemas 重新產生

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, RootModel, StrictFloat


class Date(RootModel[date]):
    root: date
    """
    日期（YYYY-MM-DD）
    """


class FxSeries(BaseModel):
    """
    美元兌新台幣匯率（public/data/prices/USDTWD.json）
    """

    model_config = ConfigDict(
        extra='forbid',
    )
    dates: list[Date] = Field(..., min_length=1)
    toUsd: list[StrictFloat]
    """
    買美元的價格（銀行即期賣出）
    """
    toTwd: list[StrictFloat]
    """
    換回新台幣的價格（銀行即期買入）
    """


class Model(RootModel[FxSeries]):
    root: FxSeries