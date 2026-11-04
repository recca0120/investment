"""驗收測試：回測器的圖表資料（issue #38）"""
from datetime import date

import pytest

from invest.backtest import run_dca
from invest.charts import return_frame
from tests.fakes.prices import FakePriceSource


@pytest.mark.criteria("#38-1")
def test_報酬率走勢_市值除以累計投入減1():
    prices = FakePriceSource({"VT": [(date(2025, 1, 2), 50.0), (date(2026, 1, 2), 40.0)]})
    result = run_dca(prices, "VT", monthly_amount=1000, start=date(2025, 1, 1), end=date(2026, 1, 31))

    frame = return_frame([result])

    # 2025-01-02：1,000 / 1,000 − 1 = 0%；2026-01-02：1,800 / 2,000 − 1 = −10%
    assert list(frame.columns) == ["日期", "代號", "報酬率"]
    assert frame["報酬率"].tolist() == pytest.approx([0.0, -0.10])
    assert frame["代號"].unique().tolist() == ["VT"]
