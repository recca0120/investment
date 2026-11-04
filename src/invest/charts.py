"""回測器的圖表資料（issue #5、#38）

市值走勢圖在後面幾年漲很多時，Y 軸被拉大，前期的下跌幾乎看不出來；
報酬率走勢圖（市值 ÷ 累計投入 − 1）加上 0% 基準線，新手才看得到「剛開始就跌」。
"""
from __future__ import annotations

import altair as alt
import pandas as pd

from invest.backtest import DcaResult, worst_paper_loss


def value_frame(results: list[DcaResult]) -> pd.DataFrame:
    """市值走勢：每個代號一欄，另加「累計投入」（st.line_chart 用）。"""
    series = {r.symbol: pd.Series({h.date: h.value for h in r.history}) for r in results}
    series["累計投入"] = pd.Series({h.date: h.invested for h in results[0].history})
    return pd.DataFrame(series).sort_index().ffill()


def return_frame(results: list[DcaResult]) -> pd.DataFrame:
    """報酬率走勢（長格式）：日期、代號、報酬率（市值 ÷ 累計投入 − 1）。"""
    return pd.DataFrame(
        [
            {"日期": pd.Timestamp(h.date), "代號": r.symbol, "報酬率": h.value / h.invested - 1}
            for r in results
            for h in r.history
            if h.invested > 0
        ]
    )


def return_chart(results: list[DcaResult]) -> alt.LayerChart:
    """報酬率走勢圖：每個代號一條線、0% 基準線、帳上最慘的時候標一個點。"""
    frame = return_frame(results)
    y = alt.Y("報酬率:Q", axis=alt.Axis(format="%"), title="報酬率")
    lines = alt.Chart(frame).mark_line().encode(x=alt.X("日期:T", title=None), y=y, color=alt.Color("代號:N", title=None))
    zero = alt.Chart(pd.DataFrame({"報酬率": [0.0]})).mark_rule(strokeDash=[4, 4]).encode(y="報酬率:Q")
    worst = pd.DataFrame(
        [
            {"日期": pd.Timestamp(w.date), "代號": r.symbol, "報酬率": w.loss_ratio, "說明": "帳上最慘的時候"}
            for r in results
            if (w := worst_paper_loss(r)).loss < 0
        ],
        columns=["日期", "代號", "報酬率", "說明"],
    )
    points = (
        alt.Chart(worst)
        .mark_point(size=160, filled=True, stroke="white", strokeWidth=1.5)
        .encode(x="日期:T", y="報酬率:Q", color="代號:N", tooltip=["代號:N", "說明:N", alt.Tooltip("報酬率:Q", format=".1%"), "日期:T"])
    )
    return (zero + lines + points).properties(title="報酬率走勢（市值 ÷ 累計投入 − 1）")
