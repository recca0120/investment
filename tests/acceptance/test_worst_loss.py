"""驗收測試：帳上最慘的時候與回本日（issue #36）

預期值手算，計算過程寫在註解。
"""
from datetime import date

import pytest

from invest.backtest import run_dca, worst_paper_loss
from tests.fakes.prices import FakePriceSource


@pytest.mark.criteria("#36-1")
def test_帳上最慘的時候_金額比例與之後第一次回到本金的日期():
    # Given 每月第一個交易日買 1,000 元，價格：
    #   1/2 100（買）→ 1/20 60 → 2/3 50（買）→ 2/20 70 → 3/2 80（買）→ 3/20 90
    prices = FakePriceSource({"X": [
        (date(2026, 1, 2), 100.0), (date(2026, 1, 20), 60.0),
        (date(2026, 2, 3), 50.0), (date(2026, 2, 20), 70.0),
        (date(2026, 3, 2), 80.0), (date(2026, 3, 20), 90.0),
    ]})
    result = run_dca(prices, "X", monthly_amount=1000, start=date(2026, 1, 1), end=date(2026, 3, 31))

    worst = worst_paper_loss(result)

    # 股數：1/2 買 10 股；2/3 再買 20 股（共 30）；3/2 再買 12.5 股（共 42.5）
    # 每天的「市值 − 投入」：
    #   1/2  10×100−1000 = 0      1/20 10×60−1000 = −400
    #   2/3  30×50−2000 = −500    2/20 30×70−2000 = +100
    #   3/2  42.5×80−3000 = +400  3/20 42.5×90−3000 = +825
    # 最慘是 2/3：投入 2,000、市值 1,500、少 500（−25%）；之後第一次回到本金以上是 2/20
    assert worst.date == date(2026, 2, 3)
    assert worst.invested == pytest.approx(2000)
    assert worst.value == pytest.approx(1500)
    assert worst.loss == pytest.approx(-500)
    assert worst.loss_ratio == pytest.approx(-0.25)
    assert worst.recovered == date(2026, 2, 20)


@pytest.mark.criteria("#36-1")
def test_還沒回本時_回本日是None():
    # Given 一路下跌：1/2 100（買）→ 1/20 80
    prices = FakePriceSource({"X": [(date(2026, 1, 2), 100.0), (date(2026, 1, 20), 80.0)]})
    result = run_dca(prices, "X", monthly_amount=1000, start=date(2026, 1, 1), end=date(2026, 1, 31))

    worst = worst_paper_loss(result)

    # 1/20：10×80−1000 = −200（−20%），之後沒有資料，所以還沒回本
    assert worst.date == date(2026, 1, 20)
    assert worst.loss == pytest.approx(-200)
    assert worst.recovered is None
