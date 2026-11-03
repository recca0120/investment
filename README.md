# investment

股市新手的投資學習筆記，以及投資輔助系統的開發 repo。

📖 網站：https://recca0120.github.io/investment/

> ⚠️ 本 repo 內容為個人學習筆記，不構成任何投資建議。

## 目錄

| 位置 | 內容 |
|---|---|
| [`docs/knowledge/`](docs/knowledge/) | 整理過的投資知識（未來網站的內容來源） |
| [`docs/log/`](docs/log/) | 每次討論的紀錄 |
| [`docs/decisions/`](docs/decisions/) | 已做出的決定 |
| [Issues](https://github.com/recca0120/investment/issues) | 待研究、待決定、待開發事項 |
| [Projects](https://github.com/users/recca0120/projects/3) | 任務看板 |

## 知識文章

1. [新手入門路線](docs/knowledge/01-getting-started.md)
2. [網路上常見的推薦方法](docs/knowledge/02-recommended-methods.md)
3. [投資商品優缺點比較](docs/knowledge/03-products-comparison.md)
4. [入門方案（依個性選擇）](docs/knowledge/04-starter-plans.md)
5. [投資輔助系統規劃](docs/knowledge/05-system-design.md)
6. [股價資料來源評估](docs/knowledge/06-data-sources.md)
7. [定期定額回測：0050、006208、VT（2016～2026）](docs/knowledge/07-dca-backtest-2016-2026.md)

## 投資輔助系統

```bash
uv sync                                  # 安裝相依套件
uv run streamlit run src/invest/app.py   # 啟動定期定額回測器
uv run pytest                            # 執行測試（不含需要連網的契約測試）
uv run pytest -m contract                # 執行契約測試（連網，驗證 FinMind 與 yfinance）
```

## Roadmap

- [x] 決定網站框架：Astro Starlight（見 [0002](docs/decisions/0002-site-framework.md)）
- [x] 研究新版 Astro／Starlight 並寫成 skill
- [x] 建立 Starlight 網站並部署到 GitHub Pages
- [ ] 選定個人入門方案
- [x] 系統：定期定額回測器
- [ ] 系統：持股追蹤
- [ ] 系統：ETF／個股比較器
- [ ] 系統：再平衡提醒、成本與稅試算
