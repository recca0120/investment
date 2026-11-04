#!/usr/bin/env python3
"""用真實資料重算「運氣不好時會怎樣」的情境表，直接更新文章（issue #36）。

用法：uv run python scripts/bad_luck_scenarios.py
需要連網（FinMind），結果會快取在 data/cache/。資料更新時重跑並 commit。
"""
from datetime import date
from pathlib import Path

from invest.container import build_container
from invest.scenarios import Scenario, scenario_table, update_section

ARTICLE = Path("docs/knowledge/10-bad-luck-scenarios.md")
SYMBOL, MONTHLY = "0050", 3000
SCENARIOS = [
    Scenario("2022 年大跌前", date(2021, 12, 1), date(2026, 10, 31)),
    Scenario("金融海嘯前", date(2007, 10, 1), date(2012, 12, 31)),
    Scenario("本站回測的起點", date(2016, 1, 1), date(2026, 10, 31)),
]

table = scenario_table(build_container().prices, SYMBOL, MONTHLY, SCENARIOS)
ARTICLE.write_text(update_section(ARTICLE.read_text(encoding="utf-8"), table), encoding="utf-8")
print(table)
