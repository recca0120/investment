"""驗收測試：backtest（issue #5）

預期值請手算，並在註解寫下計算過程。
"""
from datetime import date

import pytest

from invest.backtest import compare_dca, run_dca
from invest.prices import UnknownSymbolError
from tests.fakes.prices import FakePriceSource


@pytest.mark.criteria("#5-1")
def test_每月投入固定金額_計算總投入_期末市值與年化報酬():
    # Given 0050 只有兩個交易日：2025-01-02 價格 100、2026-01-02 價格 110（相隔 365 天）
    prices = FakePriceSource({"0050": [(date(2025, 1, 2), 100.0), (date(2026, 1, 2), 110.0)]})

    # When 每月投入 1,000 元，回測 2025-01 ~ 2026-01
    result = run_dca(prices, "0050", monthly_amount=1000, start=date(2025, 1, 1), end=date(2026, 1, 31))

    # Then 兩次買進（每月第一個交易日）：
    #   2025-01-02 買 1000/100 = 10 股；2026-01-02 買 1000/110 股
    #   總投入 2,000；期末市值 = 10 × 110 + 1000 = 2,100
    #   年化報酬用資金加權報酬率（XIRR）：-1000 + (2100 - 1000) / (1 + r)^(365/365) = 0 → r = 10%
    assert result.total_invested == 2000
    assert result.final_value == pytest.approx(2100)
    assert result.annualized_return == pytest.approx(0.10, abs=1e-6)


@pytest.mark.criteria("#5-2")
def test_最大跌幅以持有期間的每日價格計算():
    # Given 價格 100 → 120（高點）→ 60（低點）→ 90 → 130
    prices = FakePriceSource({"0050": [
        (date(2025, 1, 2), 100.0), (date(2025, 1, 15), 120.0),
        (date(2025, 2, 3), 60.0), (date(2025, 2, 20), 90.0), (date(2025, 3, 3), 130.0),
    ]})

    result = run_dca(prices, "0050", monthly_amount=1000, start=date(2025, 1, 1), end=date(2025, 3, 31))

    # Then 最大跌幅 = 從高點跌到低點的幅度：(120 - 60) / 120 = 50%
    #   定義：持有期間（第一次買進起）每日價格的時間加權跌幅，不受每月新投入的資金影響
    assert result.max_drawdown == pytest.approx(0.5)


@pytest.mark.criteria("#5-3")
def test_同時比較多個標的_依輸入順序回傳各自結果():
    # Given 0050 上漲 10%、VT 下跌 20%（相隔 365 天）
    prices = FakePriceSource({
        "0050": [(date(2025, 1, 2), 100.0), (date(2026, 1, 2), 110.0)],
        "VT": [(date(2025, 1, 2), 50.0), (date(2026, 1, 2), 40.0)],
    })

    results = compare_dca(prices, ["VT", "0050"], monthly_amount=1000, start=date(2025, 1, 1), end=date(2026, 1, 31))

    # Then VT：1000/50 = 20 股 × 40 + 1000 = 1,800；0050：同第一個測試 2,100
    assert [r.symbol for r in results] == ["VT", "0050"]
    assert [r.final_value for r in results] == pytest.approx([1800, 2100])


def test_比較時有查不到的代號_回報是哪一個():
    prices = FakePriceSource({"0050": [(date(2025, 1, 2), 100.0)]})
    with pytest.raises(UnknownSymbolError, match="XXXX"):
        compare_dca(prices, ["0050", "XXXX"], monthly_amount=1000, start=date(2025, 1, 1), end=date(2025, 1, 31))


@pytest.mark.criteria("#5-4")
def test_含息報酬把股利再投入_只看價格則不含股利():
    # Given 價格一直是 100；2025-02 除息配 5 元並再投入 → 含息還原價從 100 變 105
    prices = FakePriceSource({"0050": [
        (date(2025, 1, 2), 100.0, 100.0),
        (date(2025, 2, 3), 100.0, 105.0),
        (date(2025, 3, 3), 100.0, 105.0),
    ]})
    args = dict(monthly_amount=1000, start=date(2025, 1, 1), end=date(2025, 3, 31))

    with_div = run_dca(prices, "0050", include_dividends=True, **args)
    price_only = run_dca(prices, "0050", include_dividends=False, **args)

    # Then 三個月各投入 1,000，總投入 3,000
    #   含息：只有 1 月買的 10 股領到股利 10 × 5 = 50 → 3,050
    #   只看價格：價格沒變 → 3,000
    assert with_div.final_value == pytest.approx(3050)
    assert price_only.final_value == pytest.approx(3000)


def test_預設是含息報酬():
    prices = FakePriceSource({"0050": [(date(2025, 1, 2), 100.0, 100.0), (date(2025, 2, 3), 100.0, 105.0)]})
    result = run_dca(prices, "0050", monthly_amount=1000, start=date(2025, 1, 1), end=date(2025, 2, 28))
    # 1 月 10 股領到 5% 股利：1,000 × 1.05 + 1,000 = 2,050
    assert result.final_value == pytest.approx(2050)


def test_期間內沒有任何價格資料_回報清楚的錯誤():
    prices = FakePriceSource({"0050": [(date(2025, 1, 2), 100.0)]})
    with pytest.raises(ValueError, match="2030-01-01"):
        run_dca(prices, "0050", monthly_amount=1000, start=date(2030, 1, 1), end=date(2030, 12, 31))
