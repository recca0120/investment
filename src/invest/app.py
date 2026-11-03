"""定期定額回測器（issue #5）。執行：uv run streamlit run src/invest/app.py"""
from datetime import date

import pandas as pd
import streamlit as st

from invest.backtest import DcaResult, compare_dca
from invest.container import get_container
from invest.prices import UnknownSymbolError

st.set_page_config(page_title="定期定額回測器", layout="wide")
st.title("定期定額回測器")
st.caption("每月第一個交易日投入固定金額。歷史報酬不代表未來表現，不構成投資建議。")

symbols = st.text_input("代號（用逗號分隔）", value="0050, 006208, VT", key="symbols")
amount = st.number_input("每月投入", min_value=100, value=5000, step=500, key="amount")
start = st.date_input("開始", value=date(2016, 1, 1), key="start")
end = st.date_input("結束", value=date.today(), key="end")
include_dividends = st.checkbox("含息（股利再投入）", value=True, key="dividends")


def summary(results: list[DcaResult]) -> pd.DataFrame:
    return pd.DataFrame([
        {
            "代號": r.symbol,
            "總投入": f"{r.total_invested:,.0f}",
            "期末市值": f"{r.final_value:,.0f}",
            "總報酬": f"{r.total_return:.1%}",
            "年化報酬": f"{r.annualized_return:.1%}",
            "最大跌幅": f"{r.max_drawdown:.1%}",
        }
        for r in results
    ])


def value_chart(results: list[DcaResult]) -> pd.DataFrame:
    series = {r.symbol: pd.Series({h.date: h.value for h in r.history}) for r in results}
    series["累計投入"] = pd.Series({h.date: h.invested for h in results[0].history})
    return pd.DataFrame(series).sort_index().ffill()


if st.button("開始回測", key="run"):
    wanted = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    try:
        results = compare_dca(
            get_container().prices, wanted,
            monthly_amount=amount, start=start, end=end, include_dividends=include_dividends,
        )
    except UnknownSymbolError as e:
        st.error(f"查不到代號：{e.args[0]}")
    except ValueError as e:
        st.error(str(e))
    else:
        st.dataframe(summary(results), hide_index=True)
        st.line_chart(value_chart(results))
        st.caption(
            "年化報酬為資金加權報酬率（XIRR）；最大跌幅為持有期間每日價格的時間加權跌幅。"
            "美股以美元計價，未換算匯率。"
        )
