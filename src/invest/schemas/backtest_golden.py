# 自動產生，不要手改：來源 site/lib/schemas.ts（zod）→ schemas/backtest-golden.schema.json，執行 npm run schemas 重新產生

from __future__ import annotations

from datetime import date as date_aliased

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    StrictBool,
    StrictFloat,
    confloat,
    conint,
    constr,
)


class GoldenInput(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    symbol: constr(min_length=1, strict=True)
    monthly: confloat(gt=0.0, strict=True)
    start: date_aliased
    """
    日期（YYYY-MM-DD）
    """
    end: date_aliased
    """
    日期（YYYY-MM-DD）
    """
    dividends: StrictBool
    twd: StrictBool
    tax: StrictBool


class GoldenWorst(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    date: date_aliased
    """
    日期（YYYY-MM-DD）
    """
    invested: StrictFloat
    value: StrictFloat
    recovered: date_aliased | None


class GoldenExpected(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    totalInvested: StrictFloat
    finalValue: StrictFloat
    annualized: StrictFloat
    maxDrawdown: StrictFloat
    days: conint(le=9007199254740991, gt=0, strict=True)
    worst: GoldenWorst = Field(..., title='GoldenWorst')


class GoldenCase(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    input: GoldenInput = Field(..., title='GoldenInput')
    expected: GoldenExpected = Field(..., title='GoldenExpected')


class BacktestGolden(RootModel[list[GoldenCase]]):
    """
    網站回測器的標準答案（Python 算的）
    """

    root: list[GoldenCase] = Field(..., title='BacktestGolden')
    """
    網站回測器的標準答案（Python 算的）
    """


class Model(RootModel[BacktestGolden]):
    root: BacktestGolden