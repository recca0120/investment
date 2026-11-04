"""驗收測試：運氣不好的情境表（issue #36）"""
from datetime import date

import pytest

from invest.scenarios import Scenario, scenario_table, update_section
from tests.fakes.prices import FakePriceSource

PRICES = FakePriceSource({"X": [
    (date(2026, 1, 2), 100.0), (date(2026, 1, 20), 60.0),
    (date(2026, 2, 3), 50.0), (date(2026, 2, 20), 70.0),
    (date(2026, 3, 2), 80.0), (date(2026, 3, 20), 90.0),
]})


@pytest.mark.criteria("#36-2")
def test_情境表列出最慘的時候_少多少_多久回本():
    table = scenario_table(PRICES, "X", 1000, [Scenario("大跌前", date(2026, 1, 1), date(2026, 3, 31))])

    # 同 test_worst_loss：最慘 2026-02-03 投入 2,000、市值 1,500；2026-02-20 回本（17 天，不到 1 個月）
    # 期末 42.5 股 × 90 = 3,825；投入 3,000
    lines = table.splitlines()
    assert lines[0].startswith("| 開始 |")
    row = lines[2]
    assert "大跌前（2026-01）" in row
    assert "2026-02，投入 2,000，市值 1,500" in row
    assert "少 500 元（-25.0%）" in row
    assert "不到 1 個月（2026-02）" in row
    assert "投入 3,000，市值 3,825" in row


@pytest.mark.criteria("#36-2")
def test_重新執行只更新文章裡標記之間的表格():
    article = "前文\n<!-- scenarios:start -->\n舊表格\n<!-- scenarios:end -->\n後文\n"
    assert update_section(article, "| 新 |") == "前文\n<!-- scenarios:start -->\n| 新 |\n<!-- scenarios:end -->\n後文\n"
    with pytest.raises(ValueError, match="找不到"):
        update_section("沒有標記", "| 新 |")


@pytest.mark.criteria("#36-2")
def test_回本時間超過一個月_以及表格的分隔列():
    # 突變測試發現：原本只測「不到 1 個月」，「約 N 個月後」那個分支就算直接當掉也不會被發現
    from invest.backtest import PaperLoss
    from invest.scenarios import describe_worst, months_later

    # 2026-01-15 → 2026-04-15：90 天 ÷ 30.4 = 2.96 → 約 3 個月
    assert months_later(date(2026, 1, 15), date(2026, 4, 15)) == "約 3 個月後（2026-04）"
    # 剛好 1 個月以上（31 天 ÷ 30.4 = 1.02）不算「不到 1 個月」
    assert months_later(date(2026, 1, 1), date(2026, 2, 1)) == "約 1 個月後（2026-02）"
    assert months_later(date(2026, 1, 1), None) == "到結束時還沒回本"

    worst = PaperLoss(date(2022, 10, 25), 33000.0, 25578.0, date(2023, 1, 30))
    assert describe_worst("0050", worst) == (
        "0050：最慘 2022-10-25，投入 33,000，市值 25,578，少 7,422 元（-22.5%），2023-01-30 回到本金"
    )

    table = scenario_table(PRICES, "X", 1000, [Scenario("大跌前", date(2026, 1, 1), date(2026, 3, 31))])
    assert table.splitlines()[1] == "|---|---|---|---|---|"


@pytest.mark.criteria("#36-2")
def test_文章只有其中一個標記時也要報錯():
    with pytest.raises(ValueError, match="找不到"):
        update_section("前文\n<!-- scenarios:start -->\n沒有結束標記", "| 新 |")
