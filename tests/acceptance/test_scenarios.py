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
