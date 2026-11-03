# 依賴注入：從 composition root 到 DI container

## 原則

- **DI 是由測試的需求帶出來的**：第一個驗收測試需要替換什麼（資料來源、時間、檔案），就在那裡切出接縫。不要預先替還沒用到的東西加介面
- **use case 只透過參數接收依賴**，型別寫成 `Protocol`，不 import 具體套件（FinMind、yfinance）
- **只有最外層組裝依賴**：Streamlit 畫面、CLI 入口呼叫 `get_container()`，其他地方都不呼叫
- **只替換系統邊界**：網路、檔案、時間、第三方服務；內部模組之間直接呼叫，不需要注入

## 第一階段：手寫 composition root（目前採用）

`src/invest/container.py`（完整程式碼見 `assets/example/src/invest/container.py`）：

```python
@dataclass(frozen=True)
class Container:
    prices: PriceSource

def build_container() -> Container:        # 組裝真實依賴
    return Container(prices=FinMindPriceSource(token=os.environ["FINMIND_TOKEN"]))

def get_container() -> Container:          # 最外層呼叫這個
    return _override if _override is not None else build_container()

@contextmanager
def override(container: Container): ...    # 測試換成假的
```

使用方式：

| 位置 | 寫法 |
|---|---|
| use case | `def run_dca(prices: PriceSource, symbol, *, ...)`：依賴從參數進來 |
| Streamlit 畫面 | `prices = get_container().prices` |
| use case 的驗收測試 | 直接傳 Fake：`run_dca(FakePriceSource(...), "0050", ...)`，不需要 container |
| UI 測試 | `conftest.py` 的 autouse fixture：`with override(Container(prices=FAKE)): yield` |

`AppTest` 和測試在同一個 process 中執行，所以 `override()` 設定的模組層級變數，畫面可以直接讀到（已實測）。

## 什麼時候升級成 DI container 套件

出現以下任一情況時再考慮：

- 依賴之間互相依賴（例如資料來源需要快取，快取需要設定）
- 同一個依賴需要控制生命週期（每次請求建立新的，或整個程式共用一個）
- `build_container()` 開始出現大量 if/else 來切換實作
- 依賴數量多到 `Container` 的欄位難以管理

升級時：

1. 先開一個 `[決策]` issue 比較候選套件（例如 `dependency-injector`、`svcs`、`punq`），**查最新版本並實測**，不要憑記憶選擇
2. **保持 `get_container()` 與 `override()` 對外介面不變**，只替換內部實作，這樣測試和畫面都不用修改
3. 驗收測試全部保持綠燈，就代表升級沒有改變行為

## 反模式

| 反模式 | 問題 |
|---|---|
| use case 內部呼叫 `get_container()` | 依賴又藏回去了，測試必須 override 全域狀態才能測 use case |
| 用 `unittest.mock.patch("invest.sources.finmind.requests.get")` | 綁定實作細節，換 HTTP 套件測試就壞 |
| 每個類別都抽一個 Protocol | 介面爆炸；只有系統邊界需要 |
| 為了測試在產品程式碼加 `if testing:` | 測試路徑和正式路徑不同，測不到真正的行為 |
