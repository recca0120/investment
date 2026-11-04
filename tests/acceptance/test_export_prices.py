"""驗收測試：把價格匯出成網站回測器用的 JSON（issue #41，決策 0008）"""
from datetime import date

import pytest

from invest.export import export_fx, export_series
from invest.prices import FxRate
from tests.fakes.prices import FakeFxSource, FakePriceSource


@pytest.mark.criteria("#41-1")
def test_匯出每檔的日期_收盤價_含息價_美股另有扣稅後的含息價():
    # VT：2025-01-02 收盤 100、含息 100；2025-06-02 除息（股利 2，前一日收盤 100 → 殖利率 2%）
    #   含息還原價以最後一天為基準：除息前的還原價 = 收盤 × (1 − 2%)
    prices = FakePriceSource({
        "VT": [(date(2025, 1, 2), 100.0, 98.0), (date(2025, 6, 2), 100.0, 100.0)],
        "0050": [(date(2025, 1, 2), 50.0, 49.0), (date(2025, 6, 2), 52.0, 52.0)],
    })

    vt = export_series(prices, "VT", date(2025, 1, 1), date(2025, 12, 31))
    tw = export_series(prices, "0050", date(2025, 1, 1), date(2025, 12, 31))

    assert vt["symbol"] == "VT" and vt["currency"] == "USD"
    assert vt["dates"] == ["2025-01-02", "2025-06-02"]
    assert vt["close"] == [100.0, 100.0]
    assert vt["total"] == [98.0, 100.0]
    # 扣 30% 股利稅：只有 70% 的股利再投入 → 除息前的調整因子 = 1 − 0.7 × 2% = 0.986
    assert vt["totalTaxed"] == pytest.approx([98.6, 100.0])
    # 台股沒有預扣稅，不輸出 totalTaxed
    assert tw["currency"] == "TWD" and "totalTaxed" not in tw


@pytest.mark.criteria("#41-1")
def test_匯出美元匯率():
    fx = FakeFxSource([
        FxRate(date(2025, 1, 2), to_usd=30.5, to_twd=30.4),
        FxRate(date(2025, 1, 3), to_usd=30.6, to_twd=30.5),
    ])
    out = export_fx(fx, date(2025, 1, 1), date(2025, 1, 31))
    assert out == {"dates": ["2025-01-02", "2025-01-03"], "toUsd": [30.5, 30.6], "toTwd": [30.4, 30.5]}


@pytest.mark.criteria("#41-2")
def test_讀回匯出的JSON_回測結果和原本的資料來源相同():
    from invest.backtest import run_dca
    from invest.export import JsonPriceSource

    prices = FakePriceSource({"0050": [(date(2025, 1, 2), 100.0, 100.0), (date(2026, 1, 2), 110.0, 115.5)]})
    start, end = date(2025, 1, 1), date(2026, 1, 31)
    roundtrip = JsonPriceSource({"0050": export_series(prices, "0050", start, end)})

    a = run_dca(prices, "0050", monthly_amount=1000, start=start, end=end)
    b = run_dca(roundtrip, "0050", monthly_amount=1000, start=start, end=end)
    assert (a.total_invested, a.final_value, a.annualized_return) == (b.total_invested, b.final_value, b.annualized_return)
