from datetime import date

import streamlit as st

from invest.backtest import run_dca


def default_price_source():
    raise RuntimeError("真實資料來源尚未實作")  # 之後接 FinMind / yfinance


# 測試時由 session_state 注入假的來源；正式執行時用真實來源
prices = st.session_state.get("price_source") or default_price_source()

st.title("定期定額回測器")
symbol = st.text_input("代號", value="0050", key="symbol")
amount = st.number_input("每月投入", min_value=100, value=1000, step=100, key="amount")
start = st.date_input("開始", value=date(2016, 1, 1), key="start")
end = st.date_input("結束", value=date(2026, 1, 1), key="end")

if st.button("開始回測", key="run"):
    try:
        r = run_dca(prices, symbol, monthly_amount=amount, start=start, end=end)
    except KeyError:
        st.error(f"查不到代號 {symbol}")
    else:
        st.metric("總投入", f"{r.total_invested:,.0f}")
        st.metric("期末市值", f"{r.final_value:,.0f}")
        st.metric("最大跌幅", f"{r.max_drawdown:.1%}")
