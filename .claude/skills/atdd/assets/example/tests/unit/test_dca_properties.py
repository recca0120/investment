from datetime import date

import pytest
from hypothesis import given, strategies as st

from invest.backtest import run_dca
from tests.fakes.prices import FakePriceSource


@given(
    price=st.floats(min_value=1, max_value=10_000),
    months=st.integers(min_value=1, max_value=24),
    amount=st.integers(min_value=100, max_value=100_000),
)
def test_價格不變時_期末市值等於總投入且沒有跌幅(price, months, amount):
    days = {date(2026 + (m // 12), m % 12 + 1, 1): price for m in range(months)}
    r = run_dca(FakePriceSource({"X": days}), "X", monthly_amount=amount, start=date(2026, 1, 1), end=date(2030, 1, 1))
    assert r.final_value == pytest.approx(r.total_invested)
    assert r.max_drawdown == pytest.approx(0, abs=1e-9)


def test_測試中連網會被擋下():
    import socket
    from pytest_socket import SocketBlockedError
    with pytest.raises(SocketBlockedError):
        socket.create_connection(("example.com", 80))
