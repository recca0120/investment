from datetime import date

import pytest

from invest.container import Container, override
from invest.prices import FxRate
from tests.fakes.prices import FakeFxSource, FakePriceSource

PRICES = FakePriceSource({
    "0050": [(date(2025, 1, 2), 100.0, 100.0), (date(2026, 1, 2), 110.0, 115.5)],
    "VT": [(date(2025, 1, 2), 50.0), (date(2026, 1, 2), 40.0)],
})

# 匯率：2025-01-02 一美元 30 元、2026-01-02 一美元 32 元（買賣同價，方便手算）
FX = FakeFxSource([
    FxRate(date(2025, 1, 2), to_usd=30.0, to_twd=30.0),
    FxRate(date(2026, 1, 2), to_usd=32.0, to_twd=32.0),
])


@pytest.fixture(autouse=True)
def fake_container():
    """UI 測試一律用假的依賴；畫面透過 get_container() 拿到的就是這裡的 Fake。"""
    with override(Container(prices=PRICES, fx=FX)) as c:
        yield c
