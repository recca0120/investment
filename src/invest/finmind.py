"""FinMind 價格來源（issue #5；選擇理由見 docs/decisions/0003-data-source.md）

- 台股：原始收盤價 ＋ 分割事件 ＋ 現金股利，自己計算
  - close：只調整分割（分割前價格 ÷ 分割比例）
  - total_return：再乘上除息調整因子 (1 - 股利 / 除息前一日收盤)，等同股利在除息前一日收盤價再投入
- 美股：直接使用 Close 與 Adj_Close
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import date
from pathlib import Path

from invest.prices import PricePoint, UnknownSymbolError

Fetch = Callable[[str, str], list[dict]]

API_URL = "https://api.finmindtrade.com/api/v4/data"


class FinMindPriceSource:
    def __init__(self, fetch: Fetch):
        self._fetch = fetch

    def daily(self, symbol: str, start: date, end: date) -> list[PricePoint]:
        points = self._taiwan(symbol) if _is_taiwan(symbol) else self._us(symbol)
        if not points:
            raise UnknownSymbolError(symbol)
        return [p for p in points if start <= p.date <= end]

    def _us(self, symbol: str) -> list[PricePoint]:
        rows = self._fetch("USStockPrice", symbol)
        return sorted(PricePoint(date.fromisoformat(r["date"]), r["Close"], r["Adj_Close"]) for r in rows)

    def _taiwan(self, symbol: str) -> list[PricePoint]:
        # 沒有成交的日子 FinMind 收盤價記為 0（例如 006208 早期），略過
        raw = sorted(
            (date.fromisoformat(r["date"]), r["close"])
            for r in self._fetch("TaiwanStockPrice", symbol)
            if r["close"] and r["close"] > 0
        )
        if not raw:
            return []
        splits = [
            (date.fromisoformat(r["date"]), _split_ratio(r["before_price"], r["after_price"]))
            for r in self._fetch("TaiwanStockSplitPrice", symbol)
        ]
        dividends = [
            (date.fromisoformat(r["CashExDividendTradingDate"]), r["CashEarningsDistribution"])
            for r in self._fetch("TaiwanStockDividend", symbol)
            if r.get("CashExDividendTradingDate") and r.get("CashEarningsDistribution")
        ]
        return _adjust(raw, splits, dividends)


def _is_taiwan(symbol: str) -> bool:
    return symbol[:1].isdigit()


def _split_ratio(before: float, after: float) -> float:
    # 參考價會四捨五入（188.65 / 47.16 = 4.0002），接近整數時取整數
    ratio = before / after
    return float(round(ratio)) if abs(ratio - round(ratio)) < 0.01 else ratio


def _adjust(
    raw: list[tuple[date, float]],
    splits: list[tuple[date, float]],
    dividends: list[tuple[date, float]],
) -> list[PricePoint]:
    """由新到舊累乘調整因子：分割日之前 ÷ 比例；除息日之前 × (1 - 股利 / 前一日原始收盤)。"""
    dates = [d for d, _ in raw]

    def effective_index(d: date) -> int | None:
        # 事件日不是交易日時，套用在下一個交易日
        return next((i for i, x in enumerate(dates) if x >= d), None)

    split_at: dict[int, float] = {}
    for d, ratio in splits:
        if (i := effective_index(d)) is not None:
            split_at[i] = split_at.get(i, 1.0) * ratio
    div_at: dict[int, float] = {}
    for d, cash in dividends:
        if (i := effective_index(d)) is not None and i > 0:
            div_at[i] = div_at.get(i, 1.0) * (1 - cash / raw[i - 1][1])

    points: list[PricePoint] = []
    split_factor = div_factor = 1.0
    for i in range(len(raw) - 1, -1, -1):
        d, close = raw[i]
        points.append(PricePoint(d, close / split_factor, close / split_factor * div_factor))
        # 第 i 天的事件影響 i 之前的所有價格
        split_factor *= split_at.get(i, 1.0)
        div_factor *= div_at.get(i, 1.0)
    return points[::-1]


class FinMindHttpFetch:
    """真實的 FinMind HTTP 呼叫，結果快取在本機（預設 data/cache/finmind/，當天內重複使用）。"""

    def __init__(self, cache_dir: Path = Path("data/cache/finmind"), token: str | None = None, max_age_hours: float = 12):
        self.cache_dir = cache_dir
        self.token = token
        self.max_age = max_age_hours * 3600

    def __call__(self, dataset: str, data_id: str) -> list[dict]:
        cache = self.cache_dir / f"{dataset}_{data_id}.json"
        if cache.exists() and time.time() - cache.stat().st_mtime < self.max_age:
            return json.loads(cache.read_text())
        rows = self._request(dataset, data_id)
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(rows, ensure_ascii=False))
        return rows

    def _request(self, dataset: str, data_id: str) -> list[dict]:
        query = urllib.parse.urlencode({"dataset": dataset, "data_id": data_id, "start_date": "1990-01-01"})
        req = urllib.request.Request(f"{API_URL}?{query}")
        if self.token:
            req.add_header("Authorization", f"Bearer {self.token}")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 402:
                raise RuntimeError("FinMind 呼叫次數超過上限（不帶 token 每小時 300 次），請稍後再試或設定 FINMIND_TOKEN") from e
            raise RuntimeError(f"FinMind API 錯誤 {e.code}：{dataset} {data_id}") from e
        return body.get("data", [])
