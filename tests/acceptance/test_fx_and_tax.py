"""驗收測試：換算新台幣匯率、美股股利預扣稅（issue #12）

預期值請手算，並在註解寫下計算過程。
"""
from datetime import date

import pytest

from invest.backtest import run_dca
from invest.prices import FxRate
from tests.fakes.prices import FakePriceSource


@pytest.mark.criteria("#12-1")
def test_每月投入新台幣_以當日匯率換美元買進_市值以當日匯率換回新台幣():
    # Given VT：2025-01-02 價格 50 美元、2025-02-03 價格 40 美元
    prices = FakePriceSource({"VT": [(date(2025, 1, 2), 50.0), (date(2025, 2, 3), 40.0)]})
    # 匯率：to_usd = 買 1 美元要付的新台幣（銀行即期賣出價）；to_twd = 賣 1 美元拿回的新台幣（銀行即期買入價）
    fx = [
        FxRate(date(2025, 1, 2), to_usd=30.0, to_twd=29.9),
        FxRate(date(2025, 2, 3), to_usd=32.0, to_twd=31.9),
    ]

    # When 每月投入 3,000 新台幣
    result = run_dca(prices, "VT", monthly_amount=3000, start=date(2025, 1, 1), end=date(2025, 2, 28), fx=fx)

    # Then
    #   1 月：3000 / 30 = 100 美元 → 100 / 50 = 2 股
    #   2 月：3000 / 32 = 93.75 美元 → 93.75 / 40 = 2.34375 股
    #   期末 4.34375 股 × 40 美元 × 31.9（期末換回新台幣）= 5,542.625 新台幣
    #   1 月底的市值（第一個交易日）：2 股 × 50 × 29.9 = 2,990（買進當下就少了匯差 10 元）
    assert result.total_invested == 6000
    assert result.final_value == pytest.approx(5542.625)
    assert result.history[0].value == pytest.approx(2990)
    # 最大跌幅以新台幣計價的價格計算：50 × 29.9 = 1,495 → 40 × 31.9 = 1,276，跌幅 1 - 1276/1495
    assert result.max_drawdown == pytest.approx(1 - 1276 / 1495)


@pytest.mark.criteria("#12-2")
def test_美股含息報酬可以扣除_30_百分比股利預扣稅():
    # Given 2025-01-02 收盤 100、含息還原價 95；2025-01-03 除息後收盤 100、還原價 100
    #   還原價／收盤價的比值從 0.95 變成 1：表示 1/3 除息，股利 = 前一日收盤的 5%（每股 5 美元）
    prices = FakePriceSource({"VT": [(date(2025, 1, 2), 100.0, 95.0), (date(2025, 1, 3), 100.0, 100.0)]})

    def final(tax: float) -> float:
        return run_dca(
            prices, "VT", monthly_amount=1000, start=date(2025, 1, 1), end=date(2025, 1, 31), dividend_tax=tax
        ).final_value

    # 不扣稅：1000 / 95 股 × 100 = 1,052.63（股利 5% 全部再投入）
    assert final(0.0) == pytest.approx(1000 / 95 * 100)
    # 扣 30%：只有 70% 的股利再投入，除息調整因子 = 1 - 0.7 × 5% = 0.965
    #   扣稅後的還原價：1/2 = 100 × 0.965 = 96.5 → 1000 / 96.5 股 × 100 = 1,036.27
    assert final(0.3) == pytest.approx(1000 / 96.5 * 100)


def test_匯率缺日時用最近一個營業日的匯率():
    # 台灣放假、美股開盤的日子沒有匯率：用前一個有匯率的日子
    prices = FakePriceSource({"VT": [(date(2025, 1, 2), 50.0), (date(2025, 1, 3), 50.0)]})
    fx = [FxRate(date(2025, 1, 2), to_usd=30.0, to_twd=30.0)]
    result = run_dca(prices, "VT", monthly_amount=3000, start=date(2025, 1, 1), end=date(2025, 1, 31), fx=fx)
    # 1/3 用 1/2 的匯率：2 股 × 50 × 30 = 3,000
    assert result.final_value == pytest.approx(3000)


def test_第一次買進之前沒有任何匯率時回報錯誤():
    prices = FakePriceSource({"VT": [(date(2025, 1, 2), 50.0)]})
    fx = [FxRate(date(2025, 1, 10), to_usd=30.0, to_twd=30.0)]
    with pytest.raises(ValueError, match="2025-01-02 之前沒有匯率"):
        run_dca(prices, "VT", monthly_amount=3000, start=date(2025, 1, 1), end=date(2025, 1, 31), fx=fx)


def test_比較多個標的時_只有美股換算匯率與扣稅_台股不受影響():
    from invest.backtest import compare_dca
    from tests.fakes.prices import FakeFxSource

    prices = FakePriceSource({
        "0050": [(date(2025, 1, 2), 100.0, 95.0), (date(2025, 1, 3), 100.0, 100.0)],
        "VT": [(date(2025, 1, 2), 100.0, 95.0), (date(2025, 1, 3), 100.0, 100.0)],
    })
    fx = FakeFxSource([FxRate(date(2025, 1, 2), to_usd=25.0, to_twd=25.0)])
    tw, us = compare_dca(
        prices, ["0050", "VT"], monthly_amount=1000, start=date(2025, 1, 1), end=date(2025, 1, 31),
        fx=fx, us_dividend_tax=0.3,
    )
    # 0050：新台幣計價、不扣美國預扣稅 → 1000 / 95 × 100
    assert tw.final_value == pytest.approx(1000 / 95 * 100)
    # VT：1000 新台幣 = 40 美元 → 40 / 96.5 股 × 100 美元 × 25 = 1000 / 96.5 × 100（匯率不變，結果同扣稅後）
    assert us.final_value == pytest.approx(1000 / 96.5 * 100)
