"""驗收測試：定期定額回測器（對應 issue #5）

數字都用手算得出，寫在註解裡，讓人看得懂預期值從哪來。
"""
from datetime import date

import pytest

from invest.backtest import run_dca
from tests.fakes.prices import FakePriceSource

PRICES = FakePriceSource({
    "0050": {date(2026, 1, 2): 100.0, date(2026, 2, 2): 50.0, date(2026, 3, 2): 100.0},
})


def test_每月投入固定金額_期末計算總投入與市值():
    # Given 0050 三個月價格 100 → 50 → 100，每月投入 1,000 元
    # When 回測 2026-01 ~ 2026-03
    result = run_dca(PRICES, "0050", monthly_amount=1000, start=date(2026, 1, 1), end=date(2026, 3, 31))

    # Then 股數 = 10 + 20 + 10 = 40，總投入 3,000，期末市值 40 × 100 = 4,000
    assert result.total_invested == 3000
    assert result.shares == pytest.approx(40)
    assert result.final_value == pytest.approx(4000)
    assert result.return_rate == pytest.approx(4000 / 3000 - 1)


def test_回測期間顯示最大跌幅():
    # Given 同上：第 2 個月市值 10 × 50 = 500，對比當時投入 1,000 的市值最高點 1,000
    result = run_dca(PRICES, "0050", monthly_amount=1000, start=date(2026, 1, 1), end=date(2026, 3, 31))

    # Then 最大跌幅以「持股市值」計：高點 1,000（第 1 月）→ 第 2 月持股 10 股 × 50 = 500，跌 50%
    assert result.max_drawdown == pytest.approx(0.5)


def test_查不到的代號_回報清楚的錯誤():
    with pytest.raises(KeyError, match="XXXX"):
        run_dca(PRICES, "XXXX", monthly_amount=1000, start=date(2026, 1, 1), end=date(2026, 3, 31))
