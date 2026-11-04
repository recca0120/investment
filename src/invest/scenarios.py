"""運氣不好的情境：定期定額剛好在大跌前開始（issue #36）

產生 docs/knowledge 文章裡的情境表；scripts/bad_luck_scenarios.py 用真實資料重算並更新文章，數字不手抄。
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from invest.backtest import PaperLoss, run_dca, worst_paper_loss
from invest.prices import PriceSource

START_MARK = "<!-- scenarios:start -->"
END_MARK = "<!-- scenarios:end -->"


@dataclass(frozen=True)
class Scenario:
    label: str
    start: date
    end: date


def months_later(start: date, end: date | None) -> str:
    if end is None:
        return "到結束時還沒回本"
    months = (end - start).days / 30.4
    when = f"{end:%Y-%m}"
    return f"不到 1 個月（{when}）" if months < 1 else f"約 {round(months)} 個月後（{when}）"


def scenario_table(prices: PriceSource, symbol: str, monthly: float, scenarios: list[Scenario]) -> str:
    """每個情境一列：開始、最慘的時候、少多少、多久回本、到結束時的結果。"""
    rows = [
        "| 開始 | 最慘的時候 | 帳上少多少 | 多久回本 | 到結束時 |",
        "|---|---|---|---|---|",
    ]
    for s in scenarios:
        result = run_dca(prices, symbol, monthly_amount=monthly, start=s.start, end=s.end)
        worst = worst_paper_loss(result)
        rows.append(
            f"| {s.label}（{s.start:%Y-%m}） "
            f"| {worst.date:%Y-%m}，投入 {worst.invested:,.0f}，市值 {worst.value:,.0f} "
            f"| **少 {-worst.loss:,.0f} 元（{worst.loss_ratio:.1%}）** "
            f"| {months_later(worst.date, worst.recovered)} "
            f"| {s.end:%Y-%m}：投入 {result.total_invested:,.0f}，市值 {result.final_value:,.0f}，年化 {result.annualized_return:.1%} |"
        )
    return "\n".join(rows)


def update_section(article: str, table: str) -> str:
    """把文章裡兩個標記之間的內容換成新的表格，其他內容不動。"""
    start, end = article.find(START_MARK), article.find(END_MARK)
    if start == -1 or end == -1:
        raise ValueError(f"文章裡找不到 {START_MARK} 和 {END_MARK}")
    return f"{article[: start + len(START_MARK)]}\n{table}\n{article[end:]}"


def describe_worst(symbol: str, worst: PaperLoss) -> str:
    """一句話說明帳上最慘的時候（回測器畫面用，issue #38）。"""
    if worst.loss >= 0:
        return f"{symbol}：沒有虧損過（市值一直在累計投入以上）"
    return (
        f"{symbol}：最慘 {worst.date:%Y-%m-%d}，投入 {worst.invested:,.0f}，市值 {worst.value:,.0f}，"
        f"少 {-worst.loss:,.0f} 元（{worst.loss_ratio:.1%}），"
        + ("到結束時還沒回本" if worst.recovered is None else f"{worst.recovered:%Y-%m-%d} 回到本金")
    )
