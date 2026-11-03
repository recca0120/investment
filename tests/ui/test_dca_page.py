"""UI 驗收測試：定期定額回測頁面（issue #5）"""
from datetime import date
from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

APP = str(Path(__file__).parents[2] / "src/invest/app.py")


def run_backtest(
    symbols: str, include_dividends: bool = False, currency: str = "原幣計價", us_tax: bool = False
) -> AppTest:
    at = AppTest.from_file(APP).run()
    at.radio(key="currency").set_value(currency)
    at.checkbox(key="us_tax").set_value(us_tax)
    at.text_input(key="symbols").input(symbols)
    at.number_input(key="amount").set_value(1000)
    at.date_input(key="start").set_value(date(2025, 1, 1))
    at.date_input(key="end").set_value(date(2026, 1, 31))
    at.checkbox(key="dividends").set_value(include_dividends)
    return at.button(key="run").click().run()


def table(at: AppTest) -> list[dict]:
    # 先確認畫面沒有例外：否則看到的會是「找不到表格」，而不是真正的錯誤原因
    assert not at.exception, at.exception[0].message
    return at.dataframe[0].value.to_dict("records")


@pytest.mark.criteria("#5-3")
def test_輸入多個代號_表格列出每個標的的總投入_市值_報酬與最大跌幅():
    at = run_backtest("0050, VT")

    # 0050：100 → 110，總投入 2,000、市值 2,100、年化 10%（同 use case 驗收測試）
    # VT：50 → 40，市值 20 股 × 40 + 1,000 = 1,800；年化：-1000 + 800/(1+r) = 0 → -20%；最大跌幅 20%
    assert table(at) == [
        {"代號": "0050", "總投入": "2,000", "期末市值": "2,100", "總報酬": "5.0%", "年化報酬": "10.0%", "最大跌幅": "0.0%"},
        {"代號": "VT", "總投入": "2,000", "期末市值": "1,800", "總報酬": "-10.0%", "年化報酬": "-20.0%", "最大跌幅": "20.0%"},
    ]


@pytest.mark.criteria("#5-4")
def test_勾選含息後_市值包含股利再投入():
    # 0050 含息還原價 100 → 115.5：1 月 10 股 × 115.5 + 1,000 = 2,155
    at = run_backtest("0050", include_dividends=True)
    assert table(at)[0]["期末市值"] == "2,155"


def test_輸入查不到的代號_顯示錯誤訊息():
    at = run_backtest("0050, XXXX")
    assert at.error[0].value == "查不到代號：XXXX"
    assert not at.exception


@pytest.mark.criteria("#12-3")
def test_可以切換換算新台幣與原幣計價():
    # VT 50 → 40 美元；匯率 30 → 32；每月 1,000
    # 原幣計價：每月 1,000 美元 → 1000/50 = 20 股、1000/40 = 25 股，市值 45 × 40 = 1,800
    assert table(run_backtest("VT", currency="原幣計價"))[0]["期末市值"] == "1,800"
    # 換算新台幣：每月 1,000 新台幣
    #   2025-01：1000 / 30 = 33.33 美元 → 0.6667 股；2026-01：1000 / 32 = 31.25 美元 → 0.78125 股
    #   期末 1.447917 股 × 40 美元 × 32 = 1,853.33 新台幣
    at = run_backtest("VT", currency="換算新台幣")
    assert table(at)[0]["期末市值"] == "1,853"
    assert "美股以當日匯率換算新台幣" in at.caption[-1].value
    # 台股不受影響（本來就是新台幣）
    assert table(run_backtest("0050", currency="換算新台幣"))[0]["期末市值"] == "2,100"


def test_勾選美股股利預扣稅後_美股含息市值變少():
    from invest.container import Container, override
    from tests.fakes.prices import FakePriceSource
    from tests.ui.conftest import FX

    # VT 2025-01-02 收盤 100、還原價 95；2025-01-03 除息後 100、100（股利 5%）
    prices = FakePriceSource({"VT": [(date(2025, 1, 2), 100.0, 95.0), (date(2025, 1, 3), 100.0, 100.0)]})
    with override(Container(prices=prices, fx=FX)):
        no_tax = table(run_backtest("VT", include_dividends=True, us_tax=False))[0]["期末市值"]
        taxed = table(run_backtest("VT", include_dividends=True, us_tax=True))[0]["期末市值"]
    # 原幣：1000 / 95 × 100 = 1,052.6；扣 30% 後 1000 / 96.5 × 100 = 1,036.3
    assert (no_tax, taxed) == ("1,053", "1,036")
