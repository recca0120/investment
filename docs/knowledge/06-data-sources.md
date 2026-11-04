---
title: 股價資料來源評估
description: 證交所、FinMind、yfinance 的實測比較，以及回測系統採用的資料來源
summary:
  - 台股用 FinMind 的原始價、股利、分割，自己算還原價
  - 美股用 FinMind 的 Adj_Close
  - yfinance 只做交叉驗證，證交所只用來抽查
sidebar:
  order: 8 # 新手路線第 8 站（決策 0006）
---

> 2026-11-03 實測（issue #3）。API 限制與資料集可能變動，使用前請以官方文件為準。

## 結論

| 用途 | 採用 | 原因 |
|---|---|---|
| 台股價格 | **FinMind** 原始收盤價 ＋ 現金股利 ＋ 分割事件，自己計算還原價 | 和證交所官方數字一致、歷史從上市日開始、算法透明可驗證 |
| 美股價格 | **FinMind** `USStockPrice` 的 `Adj_Close` | 和 yfinance 的還原價只差 0.005% |
| 交叉驗證 | yfinance | 非官方，實測發現多一筆不存在的股利，只適合拿來比對 |
| 官方基準 | 證交所 | 一次只能查一個月，太慢，只用來抽查原始價格 |

## 三個來源比較

| | 證交所 | FinMind（不帶 token） | yfinance |
|---|---|---|---|
| 性質 | 官方 | 開源專案整理官方資料 | 非官方，抓取 Yahoo Finance |
| 0050 歷史起點 | 很早 | 2003-06-30（上市日） | 2009-01-02 |
| 美股 | 無 | 有（VT 從 2008 年起） | 有 |
| 股票分割 | 原始價格，分割當天價格斷崖 | 原始價格；另有 `TaiwanStockSplitPrice` 記錄分割事件 | 已事先調整（分割前價格除以 4），沒有記錄分割事件 |
| 股利 | 需另外查 | `TaiwanStockDividend`（原始金額、除息日） | 已依分割調整 |
| 還原價（含股利） | 無 | 台股 `TaiwanStockPriceAdj` 不帶 token 會回 400；美股有 `Adj_Close` | `Adj Close` |
| 呼叫限制 | 一次查一個月 | 每小時 300 次；註冊免費 token 後 600 次 | 無官方限制，但可能被擋 |

## 實測重點

### 0050 在 2025-06-18 做了 1 拆 4

| 日期 | 證交所 | FinMind | yfinance |
|---|---|---|---|
| 2025-06-10 | 188.65 | 188.65 | 47.16（已除以 4） |
| 2025-06-11～06-17 | 停止交易 | 無資料 | 47.16（補上同一個價格） |
| 2025-06-18 | 47.57 | 47.57 | 47.57 |

沒有處理分割的話，回測會以為 0050 在一天之內跌了 75%。所以使用原始價格時，**一定要用分割事件調整**。FinMind 的 `TaiwanStockSplitPrice` 提供分割前後的參考價（188.65 → 47.16），可以算出 4:1 的比例。

### 用官方資料驗證 yfinance

期間 2016-01-04 ～ 2026-10-30，持有 0050，股利在除息日以前一天收盤價再投入：

| 算法 | 總報酬倍數 |
|---|---|
| FinMind 原始價格＋股利＋分割，自己計算 | 9.6811 |
| yfinance `Adj Close` | 9.7619 |
| 只看價格、不含股利 | 7.0495 |

- 兩者相差 0.83%，大致吻合
- 逐筆比對 21 次除息，金額全部一致，但 **yfinance 在 2022-08-02 多了一筆 0.0575 元**（換算回分割前是 0.23 元），官方資料沒有這次配息
- **股利貢獻了大約 37% 的報酬**，回測如果只看價格，會嚴重低估定期定額的成果

### 美股 VT

同一期間，FinMind `Adj_Close` 倍數 3.4357，yfinance 3.4356，差異 0.005%。

## 對回測系統的影響

- 資料來源介面要提供「已調整好的價格序列」，分割和股利的處理放在資料來源層，回測邏輯不需要知道
- 台股的調整邏輯要有測試：用 0050 分割前後、除息前後的數字當驗收案例
- 呼叫次數有限，要在本機快取（`data/cache/`，不進 git）
- 契約測試：同一組測試跑在 Fake 和 FinMind 上，確認行為一致；需要連網，平常不跑

## 資料來源

- [FinMind Quick start（呼叫限制）](https://finmind.github.io/quickstart)
- [FinMind IP 封鎖政策](https://finmind.github.io/BanIPPolicy/)
- [FinMind 技術面資料集](https://finmind.github.io/tutor/TaiwanMarket/Technical/)
- [證交所 個股日成交資訊](https://www.twse.com.tw/zh/trading/historical/stock-day.html)
- [TechNews：0050 去年 6 月分割後股價破百](https://finance.technews.tw/2026/05/25/100-yuan-mark/)
- 實測：FinMind API v4、yfinance 1.7.0、證交所 `rwd/zh/afterTrading/STOCK_DAY`（2026-11-03）
