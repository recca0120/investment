"""定期定額回測器（issue #5；匯率與美股預扣稅 issue #12）。執行：uv run streamlit run src/invest/app.py"""
from datetime import date

import pandas as pd
import streamlit as st

from invest.backtest import DcaResult, compare_dca, worst_paper_loss
from invest.charts import return_chart, value_frame
from invest.container import get_container
from invest.prices import UnknownSymbolError
from invest.scenarios import describe_worst

st.set_page_config(page_title="定期定額回測器", layout="wide")
st.title("定期定額回測器")
st.caption("每月第一個交易日投入固定金額。歷史報酬不代表未來表現，不構成投資建議。")

symbols = st.text_input("代號（用逗號分隔）", value="0050, 006208, VT", key="symbols")
amount = st.number_input("每月投入", min_value=100, value=5000, step=500, key="amount")
start = st.date_input("開始", value=date(2016, 1, 1), key="start")
end = st.date_input("結束", value=date.today(), key="end")
include_dividends = st.checkbox("含息（股利再投入）", value=True, key="dividends")
currency_mode = st.radio(
    "計價", ["換算新台幣", "原幣計價"], horizontal=True, key="currency",
    help="換算新台幣：每月投入的是新台幣，美股以當日匯率換美元買進，市值以當日匯率換回新台幣，才能和台股直接比較",
)
us_tax = st.checkbox(
    "美股股利扣 30% 預扣稅", value=True, key="us_tax",
    help="外國人領美股股利會先被扣 30%，只有剩下的 70% 能再投入",
)


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


if st.button("開始回測", key="run"):
    wanted = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    try:
        results = compare_dca(
            get_container().prices, wanted,
            monthly_amount=amount, start=start, end=end, include_dividends=include_dividends,
            fx=get_container().fx if currency_mode == "換算新台幣" else None,
            us_dividend_tax=0.3 if us_tax else 0.0,
        )
    except UnknownSymbolError as e:
        st.error(f"查不到代號：{e.args[0]}")
    except ValueError as e:
        st.error(str(e))
    else:
        st.dataframe(summary(results), hide_index=True)
        st.line_chart(value_frame(results))
        # 市值走勢圖看不出前期的下跌（後面漲多時 Y 軸被拉大），所以另外畫報酬率（issue #38）
        st.altair_chart(return_chart(results), use_container_width=True)
        st.markdown("**帳上最慘的時候**（市值減累計投入最低的那一天）\n\n" + "\n".join(
            f"- {describe_worst(r.symbol, worst_paper_loss(r))}" for r in results
        ))
        st.caption(
            "年化報酬為資金加權報酬率（XIRR）；最大跌幅為持有期間每日價格的時間加權跌幅。"
            + ("美股以當日匯率換算新台幣（買進用銀行即期賣出價、市值用即期買入價）。"
               if currency_mode == "換算新台幣" else "美股以美元計價，未換算匯率。")
            + ("美股股利已扣 30% 預扣稅。" if us_tax and include_dividends else "")
        )
