"""契約測試：真實 FinMind 與假資料來源的行為一致，並和 yfinance 交叉驗證。

需要連網，預設不跑：uv run pytest -m contract
"""
from datetime import date

import pytest

from invest.finmind import FinMindHttpFetch, FinMindPriceSource
from invest.prices import UnknownSymbolError
from tests.fakes.prices import FakePriceSource

pytestmark = [pytest.mark.contract, pytest.mark.enable_socket]

START, END = date(2016, 1, 4), date(2026, 10, 30)


@pytest.fixture(scope="module")
def finmind(tmp_path_factory):
    return FinMindPriceSource(FinMindHttpFetch(cache_dir=tmp_path_factory.mktemp("finmind")))


def sources(finmind):
    fake = FakePriceSource({"0050": [(date(2025, 1, 2), 100.0), (date(2025, 1, 3), 101.0)]})
    return {"fake": fake, "finmind": finmind}


@pytest.mark.parametrize("name", ["fake", "finmind"])
def test_查不到的代號都會報錯(finmind, name):
    with pytest.raises(UnknownSymbolError):
        sources(finmind)[name].daily("9999", date(2025, 1, 1), date(2025, 1, 31))


@pytest.mark.parametrize("name", ["fake", "finmind"])
def test_回傳期間內且依日期排序(finmind, name):
    points = sources(finmind)[name].daily("0050", date(2025, 1, 1), date(2025, 1, 31))
    assert points and points == sorted(points)
    assert all(date(2025, 1, 1) <= p.date <= date(2025, 1, 31) for p in points)


def test_0050_分割前價格已除以4(finmind):
    [p] = finmind.daily("0050", date(2025, 6, 10), date(2025, 6, 10))
    assert p.close == pytest.approx(188.65 / 4)


def yahoo_multiple(symbol: str) -> float:
    yf = pytest.importorskip("yfinance")
    h = yf.Ticker(symbol).history(start=START.isoformat(), end="2026-10-31", auto_adjust=False)
    return h["Adj Close"].iloc[-1] / h["Adj Close"].iloc[0]


def multiple(points) -> float:
    return points[-1].total_return / points[0].total_return


def test_0050_含息報酬和_yfinance_相差在_2_百分比內(finmind):
    # 2026-11-03 實測：自行計算 9.68、yfinance 9.76（yfinance 多一筆 2022-08-02 股利）
    ours = multiple(finmind.daily("0050", START, END))
    assert ours == pytest.approx(yahoo_multiple("0050.TW"), rel=0.02)


def test_VT_含息報酬和_yfinance_相差在_0_1_百分比內(finmind):
    ours = multiple(finmind.daily("VT", START, END))
    assert ours == pytest.approx(yahoo_multiple("VT"), rel=0.001)
