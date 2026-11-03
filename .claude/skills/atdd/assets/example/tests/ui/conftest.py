from datetime import date

import pytest

from invest.container import Container, override
from tests.fakes.prices import FakePriceSource

PRICES = FakePriceSource({
    "0050": {date(2026, 1, 2): 100.0, date(2026, 2, 2): 50.0, date(2026, 3, 2): 100.0},
})


@pytest.fixture(autouse=True)
def fake_container():
    """UI 測試一律用假的依賴；畫面透過 get_container() 拿到的就是這裡的 Fake。"""
    with override(Container(prices=PRICES)) as c:
        yield c
