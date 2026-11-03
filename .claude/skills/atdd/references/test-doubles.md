# 測試替身：怎麼隔離外部資料來源

## 選擇順序

1. **Fake（優先）**：有真正行為的簡化實作，例如用 dict 存價格的 `FakePriceSource`。可以在多個測試共用，測試讀起來像在描述資料
2. **Stub**：只回傳固定值，適合一次性、很單純的情況
3. **Mock（最後手段）**：驗證「某個方法被呼叫了幾次、用了什麼參數」。只用在呼叫本身就是行為的情況（例如「應該寄出通知」）。用 mock 驗證資料查詢，等於在測實作細節

## 用 Protocol 定義邊界

```python
from typing import Protocol

class PriceSource(Protocol):
    def monthly_first_close(self, symbol: str, start: date, end: date) -> list[tuple[date, float]]: ...
```

- use case 只依賴 Protocol，不依賴 FinMind、yfinance 等具體套件
- 真實來源和 Fake 都實作同一個 Protocol
- 只替換「系統邊界」（網路、檔案、時間），內部的模組不要替換

## Fake 要遵守和真實來源相同的規則

```python
class FakePriceSource:
    def monthly_first_close(self, symbol, start, end):
        if symbol not in self._prices:
            raise KeyError(f"unknown symbol: {symbol}")  # 真實來源查不到也會報錯
        ...
```

Fake 比真實來源寬鬆時（例如查不到就回傳空串列），測試全部綠燈，正式執行卻會出錯。

## 契約測試：確認 Fake 和真實來源的行為一致

同一組測試分別跑在 Fake 和真實來源上，真實來源那份標記為 `contract`（需要連網，預設不跑）：

```python
import pytest

def sources():
    yield pytest.param(FakePriceSource(SAMPLE), id="fake")
    yield pytest.param(FinMindPriceSource(), id="finmind", marks=[pytest.mark.contract, pytest.mark.enable_socket])

@pytest.mark.parametrize("source", sources())
def test_查不到的代號會報錯(source):
    with pytest.raises(KeyError):
        source.monthly_first_close("NOT_EXIST", date(2026, 1, 1), date(2026, 2, 1))

@pytest.mark.parametrize("source", sources())
def test_回傳依日期排序(source):
    rows = source.monthly_first_close("0050", date(2025, 1, 1), date(2025, 6, 30))
    assert rows == sorted(rows)
```

真實來源的實作完成後，加上這組測試；實作細節（重試、快取）不需要放進契約測試。
