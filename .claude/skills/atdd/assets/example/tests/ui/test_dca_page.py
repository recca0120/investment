"""UI 驗收測試：使用者在畫面上操作回測器"""
from datetime import date
from pathlib import Path

from streamlit.testing.v1 import AppTest

from tests.fakes.prices import FakePriceSource

APP = str(Path(__file__).parents[2] / "src/invest/app.py")
PRICES = FakePriceSource({
    "0050": {date(2026, 1, 2): 100.0, date(2026, 2, 2): 50.0, date(2026, 3, 2): 100.0},
})


def open_page() -> AppTest:
    at = AppTest.from_file(APP)
    at.session_state["price_source"] = PRICES
    return at.run()


def test_輸入條件後按回測_畫面顯示總投入_市值_最大跌幅():
    at = open_page()
    at.text_input(key="symbol").input("0050")
    at.number_input(key="amount").set_value(1000)
    at.date_input(key="start").set_value(date(2026, 1, 1))
    at.date_input(key="end").set_value(date(2026, 3, 31))
    at.button(key="run").click().run()

    shown = {m.label: m.value for m in at.metric}
    assert shown == {"總投入": "3,000", "期末市值": "4,000", "最大跌幅": "50.0%"}
    assert not at.exception


def test_輸入不存在的代號_畫面顯示錯誤訊息():
    at = open_page()
    at.text_input(key="symbol").input("XXXX")
    at.button(key="run").click().run()

    assert at.error[0].value == "查不到代號 XXXX"
