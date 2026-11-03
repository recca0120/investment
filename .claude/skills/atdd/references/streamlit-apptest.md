# 用 Streamlit AppTest 寫 UI 驗收測試（streamlit 1.66 實測）

`AppTest` 會在測試的 process 裡直接執行 Streamlit script，不需要開瀏覽器，也不需要啟動伺服器，一個測試大約只花幾十毫秒。

## 讓畫面可以被測試：注入資料來源

畫面不要直接 new 真實的資料來源，改成先看 `session_state` 裡有沒有注入的來源：

```python
# src/invest/app.py
prices = st.session_state.get("price_source") or default_price_source()
```

測試在執行前塞入 Fake：

```python
from streamlit.testing.v1 import AppTest

def open_page() -> AppTest:
    at = AppTest.from_file("src/invest/app.py")
    at.session_state["price_source"] = FakePriceSource({...})
    return at.run()
```

## 每個輸入元件都要給 `key`

用 `key` 找元件，不要依賴元件在畫面上的順序（`at.text_input[0]`）。順序一改測試就壞，這就是在測實作細節。

```python
symbol = st.text_input("代號", value="0050", key="symbol")
```

```python
at.text_input(key="symbol").input("0050")
at.number_input(key="amount").set_value(1000)
at.date_input(key="start").set_value(date(2026, 1, 1))
at.button(key="run").click().run()      # 操作後要 .run() 才會重新執行 script
```

## 斷言使用者看得到的東西

```python
shown = {m.label: m.value for m in at.metric}
assert shown == {"總投入": "3,000", "期末市值": "4,000", "最大跌幅": "50.0%"}

assert at.error[0].value == "查不到代號 XXXX"
assert not at.exception                  # 畫面上沒有出現未處理的例外
```

- 斷言**畫面上顯示的格式化字串**（`"3,000"`、`"50.0%"`），因為那才是使用者看到的
- 數值計算的精確度交給 use case 層的驗收測試用 `approx` 驗證，UI 層只確認有正確顯示

## 常用元素

| 畫面元件 | 測試取得方式 | 常用屬性／方法 |
|---|---|---|
| `st.metric` | `at.metric` | `.label`、`.value` |
| `st.error`／`st.warning`／`st.success` | `at.error`、`at.warning`、`at.success` | `.value` |
| `st.text_input` | `at.text_input(key=...)` | `.input(str)` |
| `st.number_input` | `at.number_input(key=...)` | `.set_value(n)` |
| `st.date_input` | `at.date_input(key=...)` | `.set_value(date)` |
| `st.selectbox` | `at.selectbox(key=...)` | `.select(v)` |
| `st.button` | `at.button(key=...)` | `.click()` |
| `st.dataframe` | `at.dataframe` | `.value`（DataFrame） |
| 未處理例外 | `at.exception` | 空的代表沒有例外 |

完整的可執行範例：`assets/example/tests/ui/test_dca_page.py`。
