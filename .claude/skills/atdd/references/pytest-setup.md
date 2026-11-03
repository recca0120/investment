# pytest 設定與目錄結構（已實測）

## 版本（2026-11-03）

| 套件 | 版本 | 用途 |
|---|---|---|
| pytest | 9.2.0 | 測試框架 |
| pytest-socket | 0.8.1 | 測試中禁止連網 |
| hypothesis | 6.170 | 性質測試（property-based） |
| time-machine | 3.6.0 | 固定「現在時間」 |
| streamlit | 1.66.1 | UI，內建 `streamlit.testing.v1.AppTest` |

## 建立專案

```bash
uv init --lib --name invest --python 3.12 .
uv add streamlit pandas
uv add --dev pytest pytest-socket hypothesis time-machine
```

`--lib` 會產生 `src/invest/` 結構，和 `docs/`、網站的 `site/` 分開。

## pyproject.toml

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]          # 讓測試可以 `from tests.fakes.prices import ...`
addopts = "--disable-socket --allow-unix-socket"
markers = [
  "contract: 需要連網、驗證真實資料來源（預設不跑）",
]
```

- 少了 `pythonpath = ["."]` 時，`from tests.fakes...` 會出現 `ModuleNotFoundError: No module named 'tests'`（pytest 9 實測）
- `--allow-unix-socket`：Streamlit／asyncio 內部會用到 unix socket，不擋它

契約測試要連網時，個別開放：

```python
import pytest

@pytest.mark.contract
@pytest.mark.enable_socket
def test_finmind_查得到0050的月資料(): ...
```

執行：`uv run pytest -m contract`；平常 `uv run pytest -m "not contract"`。

## 目錄結構

```
src/invest/
  backtest.py           ← use case（公開入口）＋ Protocol
  app.py                ← Streamlit 畫面
  sources/              ← 真實資料來源（FinMind、yfinance…）
tests/
  __init__.py
  fakes/                ← 假物件（FakePriceSource…）
  acceptance/           ← 驗收測試（use case 層）
  ui/                   ← 驗收測試（AppTest 畫面層）
  unit/                 ← 按需補的單元／性質測試
  contract/             ← 真實來源的契約測試（需要連網）
```

## 常用指令

```bash
uv run pytest                       # 全部（不含需要連網的）
uv run pytest tests/acceptance -q   # 只跑驗收
uv run pytest -k 最大跌幅            # 依名稱篩選（中文可用）
uv run pytest --lf                  # 只重跑上次失敗的
```

## 為什麼不用 pytest-bdd（Gherkin）

pytest-bdd 讓非工程師也能讀寫 `.feature` 檔，但需要額外維護 step 綁定這一層。本專案的讀者只有使用者和 Claude，所以改用「中文測試名稱 ＋ Given/When/Then 註解」來達到同樣的可讀性，也比較省事。如果之後有不寫程式的人要參與撰寫規格，再重新評估。
