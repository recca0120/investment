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
    # 標準答案是用讀回的 JSON 算的；讀回錯了，標準答案也會跟著錯
    # 突變測試發現：原本只比對含息的結果，讀錯收盤價、匯率完全沒有測試，所以三種都比對
    from invest.backtest import compare_dca
    from invest.export import JsonFxSource, JsonPriceSource

    rows = [(date(2025, 1, 2), 100.0, 98.0), (date(2025, 2, 3), 110.0, 110.0)]
    prices = FakePriceSource({"0050": rows, "VT": rows})
    fx = FakeFxSource([FxRate(date(2025, 1, 2), 30.0, 29.9), FxRate(date(2025, 2, 3), 32.0, 31.9)])
    start, end = date(2025, 1, 2), date(2025, 2, 3)  # 期間的頭尾剛好是交易日：邊界要包含在內
    json_prices = JsonPriceSource({s: export_series(prices, s, start, end) for s in ("0050", "VT")})
    json_fx = JsonFxSource(export_fx(fx, start, end))

    for dividends in (True, False):
        for symbols, use_fx in ((["0050"], False), (["VT"], True)):
            kwargs = dict(monthly_amount=1000, start=start, end=end, include_dividends=dividends, us_dividend_tax=0.3)
            [a] = compare_dca(prices, symbols, fx=fx if use_fx else None, **kwargs)
            [b] = compare_dca(json_prices, symbols, fx=json_fx if use_fx else None, **kwargs)
            label = f"{symbols[0]} 含息={dividends}"
            assert len(b.history) == len(a.history) == 2, label
            assert (b.total_invested, b.final_value, b.annualized_return) == pytest.approx(
                (a.total_invested, a.final_value, a.annualized_return)), label
