---
title: 0008 網站上的回測器：瀏覽器計算，資料預先產生成 JSON
---

- 日期：2026-11-04
- 更新 [0002](0002-site-framework.md) 的架構：從 A（網站與系統分開）升級到 C（網站上互動計算）

## 背景

回測器（Python＋Streamlit）只能在本機用，使用者要開終端機打指令。0002 當時就規劃過「瀏覽器端回測器，資料由 Actions 預先產生」（架構 C），先做 A。使用者問「前端沒辦法做回測嗎？」，並提到可以在網頁上用的 SQLite。

## 查到的事實（2026-11-04）

| 項目 | 結果 |
|---|---|
| 資料量 | 0050 上市以來約 5,700 個交易日，只留日期與價格，gzip 後約 25 KB；10 檔也只有幾百 KB |
| 瀏覽器版 SQLite | sql.js（13.7k★，持續更新）、sql.js-httpvfs（3.7k★，靜態網站分段讀取，2024-08 後沒更新）、官方 sqlite-wasm（1.1k★）、wa-sqlite、DuckDB-WASM |
| FinMind | API 回 `access-control-allow-origin: *`，瀏覽器可以直接抓；不帶 token 每小時 300 次 |
| 畫圖 | Observable Plot 0.6.18（2026-11-03 更新，輸出 SVG）；uPlot 2025-03 後沒更新、Chart.js 與 uPlot 畫在 canvas |

## 選項

| 選項 | 優點 | 缺點 |
|---|---|---|
| 資料放 SQLite（sql.js／sqlite-wasm／httpvfs） | 可以用 SQL 查 | 資料只有幾百 KB，SQLite 程式本身就約 1 MB；httpvfs 是給 GB 級資料、而且沒在維護 |
| 資料放 JSON，預先產生（固定幾檔） | 最簡單、最快；不受 FinMind 次數限制與服務狀況影響 | 只能選事先準備好的代號 |
| 瀏覽器直接抓 FinMind | 任何代號都能查 | 每小時 300 次、靠第三方服務；台股的股利、分割調整要在瀏覽器重做 |
| 用 Pyodide 在瀏覽器跑 Python | 計算只有一份 | 要下載約 10 MB |

## 決定

1. **資料放 JSON，由 Python 預先產生**：`scripts/export_prices.py` 用現有的資料來源（FinMind＋自己算的還原價）輸出每檔的日期、收盤價、含息價、扣 30% 股利稅的含息價，以及美元匯率。股利與分割的調整只在 Python 做，瀏覽器不用重做
2. **代號先用名詞解釋裡的常見代號**；之後需要時再加「瀏覽器直接抓 FinMind」
3. **瀏覽器只做定期定額的計算**（買進、市值、年化報酬、最大跌幅、帳上最慘的時候），用 TypeScript 寫
4. **Python 是標準答案**：Python 對同一份 JSON、同一組輸入產生標準結果，TypeScript 的測試必須算出一樣的數字；兩邊計算不一致時測試會失敗
5. **畫圖用 Observable Plot**（SVG，測試抓得到元素、螢幕閱讀器讀得到）
6. **網站多一個「工具」分區**，回測器放在這裡；之後的比較器、成本試算也放這裡
7. 不用 SQLite：資料量太小；資料變多（幾百檔、分鐘資料）時再評估 SQLite 或 DuckDB

## 理由

- 新手不用打指令，手機也能用
- 預先產生的資料讓網頁不依賴第三方服務，也不會遇到次數限制
- 兩套計算最大的風險是結果不一致；股利調整留在 Python、用標準答案測試 TypeScript，把風險壓到最小
- Python 回測器保留：本機可以查任何代號、做進一步分析

## 資料來源

- [sql-js/sql.js](https://github.com/sql-js/sql.js)、[phiresky/sql.js-httpvfs](https://github.com/phiresky/sql.js-httpvfs)、[sqlite/sqlite-wasm](https://github.com/sqlite/sqlite-wasm)、[rhashimoto/wa-sqlite](https://github.com/rhashimoto/wa-sqlite)、[duckdb/duckdb-wasm](https://github.com/duckdb/duckdb-wasm)
- [Observable Plot](https://observablehq.com/plot/)
- [FinMind API](https://finmind.github.io/)
