"""驗收測試：FinMind 價格來源（issue #5，資料來源依 docs/decisions/0003-data-source.md）

測試資料使用 0050 的真實數字：2025-06-18 一拆四（188.65 → 47.16）。
"""
from datetime import date

import pytest

from invest.finmind import FinMindPriceSource
from invest.prices import UnknownSymbolError


class FakeFetch:
    """取代 FinMind HTTP API：(dataset, data_id) → 原始資料列。"""

    def __init__(self, responses: dict[tuple[str, str], list[dict]]):
        self.responses = responses

    def __call__(self, dataset: str, data_id: str) -> list[dict]:
        return self.responses.get((dataset, data_id), [])


def taiwan(prices, dividends=(), splits=(), symbol="0050"):
    return FakeFetch({
        ("TaiwanStockPrice", symbol): [{"date": d, "close": c} for d, c in prices],
        ("TaiwanStockDividend", symbol): [
            {"CashExDividendTradingDate": d, "CashEarningsDistribution": v} for d, v in dividends
        ],
        ("TaiwanStockSplitPrice", symbol): [
            {"date": d, "before_price": b, "after_price": a} for d, b, a in splits
        ],
    })


def test_台股分割前的價格依分割比例調整():
    # Given 0050 原始收盤價：分割前 188.65，2025-06-18 分割後 47.57；分割參考價 188.65 → 47.16（約 4:1）
    source = FinMindPriceSource(taiwan(
        prices=[("2025-06-10", 188.65), ("2025-06-18", 47.57)],
        splits=[("2025-06-18", 188.65, 47.16)],
    ))

    points = source.daily("0050", date(2025, 6, 1), date(2025, 6, 30))

    # Then 分割前價格 ÷ 4：188.65 / 4 = 47.1625；分割後不變
    assert [p.date for p in points] == [date(2025, 6, 10), date(2025, 6, 18)]
    assert [p.close for p in points] == pytest.approx([47.1625, 47.57])


def test_台股除息_含息還原價把除息前的價格乘上調整因子():
    # Given 前一日收盤 200，除息日配 5 元
    source = FinMindPriceSource(taiwan(
        prices=[("2025-01-16", 200.0), ("2025-01-17", 195.0), ("2025-01-20", 196.0)],
        dividends=[("2025-01-17", 5.0)],
    ))

    points = source.daily("0050", date(2025, 1, 1), date(2025, 1, 31))

    # Then 調整因子 = 1 - 5 / 200 = 0.975；除息日之前的含息還原價 = 200 × 0.975 = 195
    #   收盤價（只調整分割）維持原樣
    assert [p.close for p in points] == pytest.approx([200, 195, 196])
    assert [p.total_return for p in points] == pytest.approx([195, 195, 196])


def test_分割前的股利用分割前的價格計算調整因子():
    # Given 2025-01 除息 5 元（分割前，前一日 200），2025-06-18 一拆四
    source = FinMindPriceSource(taiwan(
        prices=[("2025-01-16", 200.0), ("2025-01-17", 195.0), ("2025-06-10", 188.65), ("2025-06-18", 47.57)],
        dividends=[("2025-01-17", 5.0)],
        splits=[("2025-06-18", 188.65, 47.16)],
    ))

    first = source.daily("0050", date(2025, 1, 1), date(2025, 12, 31))[0]

    # Then 2025-01-16：收盤 200 / 4 = 50；含息還原 50 × (1 - 5/200) = 48.75
    assert first.close == pytest.approx(50)
    assert first.total_return == pytest.approx(48.75)


def test_除息日不是交易日時_套用在下一個交易日():
    # Given 除息日 2025-01-18 是週六
    source = FinMindPriceSource(taiwan(
        prices=[("2025-01-17", 200.0), ("2025-01-20", 196.0)],
        dividends=[("2025-01-18", 5.0)],
    ))

    points = source.daily("0050", date(2025, 1, 1), date(2025, 1, 31))

    # Then 用 01-17 收盤 200 計算因子 0.975，套用在 01-20 之前
    assert [p.total_return for p in points] == pytest.approx([195, 196])


def test_只回傳查詢期間內的價格():
    source = FinMindPriceSource(taiwan(prices=[("2024-12-31", 190.0), ("2025-01-02", 195.0), ("2025-02-03", 200.0)]))
    points = source.daily("0050", date(2025, 1, 1), date(2025, 1, 31))
    assert [p.date for p in points] == [date(2025, 1, 2)]


def test_美股使用_Close_與_Adj_Close():
    source = FinMindPriceSource(FakeFetch({
        ("USStockPrice", "VT"): [{"date": "2026-10-01", "Close": 157.8, "Adj_Close": 156.9}],
    }))
    [p] = source.daily("VT", date(2026, 10, 1), date(2026, 10, 31))
    assert (p.date, p.close, p.total_return) == (date(2026, 10, 1), 157.8, 156.9)


@pytest.mark.parametrize("symbol", ["9999", "NOPE"])
def test_查不到的代號_回報_UnknownSymbolError(symbol):
    with pytest.raises(UnknownSymbolError, match=symbol):
        FinMindPriceSource(FakeFetch({})).daily(symbol, date(2025, 1, 1), date(2025, 12, 31))


def test_沒有成交的日子_收盤價為0_會被略過():
    # Given 006208 早期有沒有成交的日子，FinMind 收盤價記為 0（2013-05-20 等，共 198 天）
    source = FinMindPriceSource(taiwan(
        symbol="006208",
        prices=[("2013-05-17", 40.0), ("2013-05-20", 0.0), ("2013-05-21", 41.0)],
        dividends=[("2013-05-21", 1.0)],
    ))

    points = source.daily("006208", date(2013, 5, 1), date(2013, 5, 31))

    # Then 略過 0 元那天；除息因子用前一個「有成交」的收盤價 40：1 - 1/40 = 0.975
    assert [p.date for p in points] == [date(2013, 5, 17), date(2013, 5, 21)]
    assert [p.total_return for p in points] == pytest.approx([39, 41])


# ---------- 匯率（issue #12） ----------

def test_美元匯率_買美元用即期賣出價_換回新台幣用即期買入價():
    from invest.finmind import FinMindFxSource
    from invest.prices import FxRate

    # 2026-10-20 的真實數字（台灣銀行牌告，FinMind TaiwanExchangeRate）
    fetch = FakeFetch({("TaiwanExchangeRate", "USD"): [
        {"date": "2026-10-21", "currency": "USD", "cash_buy": 32.085, "cash_sell": 32.755, "spot_buy": 32.435, "spot_sell": 32.535},
        {"date": "2026-10-20", "currency": "USD", "cash_buy": 32.23, "cash_sell": 32.9, "spot_buy": 32.58, "spot_sell": 32.68},
        {"date": "2026-11-02", "currency": "USD", "cash_buy": -1, "cash_sell": -1, "spot_buy": -1, "spot_sell": -1},
    ]})
    rates = FinMindFxSource(fetch).usd_twd(date(2026, 10, 1), date(2026, 10, 31))
    # 依日期排序、只取期間內；沒有報價（-1）的日子略過
    assert rates == [
        FxRate(date(2026, 10, 20), to_usd=32.68, to_twd=32.58),
        FxRate(date(2026, 10, 21), to_usd=32.535, to_twd=32.435),
    ]


def test_查詢期間的最後一天要包含在內():
    # 突變測試發現：把 <= end 改成 < end（最後一天被丟掉）抓不到
    source = FinMindPriceSource(taiwan(prices=[("2025-01-02", 195.0), ("2025-02-03", 200.0)]))
    points = source.daily("0050", date(2025, 1, 2), date(2025, 2, 3))
    assert [p.date for p in points] == [date(2025, 1, 2), date(2025, 2, 3)]


def test_匯率只有一邊沒報價的日子也略過():
    # 突變測試發現：把「買價、賣價都要有報價」改成「其中一個有就好」抓不到；用到 -1 的匯率會算出負的市值
    from invest.finmind import FinMindFxSource

    fetch = FakeFetch({("TaiwanExchangeRate", "USD"): [
        {"date": "2026-10-20", "spot_buy": 32.58, "spot_sell": 32.68},
        {"date": "2026-10-21", "spot_buy": -1, "spot_sell": 32.535},
        {"date": "2026-10-22", "spot_buy": 32.4, "spot_sell": -1},
    ]})
    rates = FinMindFxSource(fetch).usd_twd(date(2026, 10, 1), date(2026, 10, 31))
    assert [r.date for r in rates] == [date(2026, 10, 20)]


def test_HTTP_結果快取在本機_有效期限內不重複呼叫(tmp_path):
    # FinMind 不帶 token 每小時只能呼叫 300 次；快取壞掉的話每次回測都會重新呼叫
    from invest.finmind import FinMindHttpFetch

    class CountingFetch(FinMindHttpFetch):
        calls: list[tuple[str, str]] = []

        def _request(self, dataset, data_id):
            CountingFetch.calls.append((dataset, data_id))
            return [{"date": "2025-01-02", "close": 100.0}]

    fetch = CountingFetch(cache_dir=tmp_path, max_age_hours=12)
    first = fetch("TaiwanStockPrice", "0050")
    second = fetch("TaiwanStockPrice", "0050")
    assert first == second == [{"date": "2025-01-02", "close": 100.0}]
    assert CountingFetch.calls == [("TaiwanStockPrice", "0050")], "有效期限內要用快取，而且查的是同一個代號"
    assert (tmp_path / "TaiwanStockPrice_0050.json").exists()

    expired = CountingFetch(cache_dir=tmp_path, max_age_hours=0)
    expired("TaiwanStockPrice", "0050")
    assert len(CountingFetch.calls) == 2, "過期後要重新呼叫"
