#!/usr/bin/env python3
"""匯出網站回測器用的價格資料與標準答案（issue #41，決策 0008）。

用法：uv run python scripts/export_prices.py
需要連網（FinMind），結果會快取在 data/cache/。資料更新時重跑並 commit。

輸出：
- public/data/prices/<代號>.json、public/data/prices/USDTWD.json：網站回測器讀的資料
- tests/site/fixtures/backtest-golden.json：Python 讀回同一份 JSON 算出的標準答案，TypeScript 的計算必須一致
"""
import json
from datetime import date
from pathlib import Path

from invest.backtest import US_DIVIDEND_TAX, compare_dca, worst_paper_loss
from invest.container import build_container
from invest.export import JsonFxSource, JsonPriceSource, export_fx, export_series

# 名詞解釋「常見代號」裡 FinMind 有的（VWRA 在倫敦掛牌，FinMind 沒有）
SYMBOLS = ["0050", "006208", "0056", "00878", "00679B", "VT", "VTI", "VXUS", "BND"]
START, END = date(2003, 1, 1), date.today()
OUT = Path("public/data/prices")
GOLDEN = Path("tests/site/fixtures/backtest-golden.json")

# 標準答案的情境：台股／美股、含息／不含息、換算新台幣／原幣、扣稅／不扣稅、本站回測與運氣不好的起點
SCENARIOS = [
    {"symbol": "0050", "monthly": 5000, "start": "2016-01-01", "end": "2026-10-31", "dividends": True, "twd": True, "tax": True},
    {"symbol": "0050", "monthly": 5000, "start": "2016-01-01", "end": "2026-10-31", "dividends": False, "twd": True, "tax": True},
    {"symbol": "0050", "monthly": 3000, "start": "2021-12-01", "end": "2026-10-31", "dividends": True, "twd": True, "tax": True},
    {"symbol": "0050", "monthly": 3000, "start": "2007-10-01", "end": "2012-12-31", "dividends": True, "twd": True, "tax": True},
    {"symbol": "006208", "monthly": 1000, "start": "2020-01-01", "end": "2024-12-31", "dividends": True, "twd": True, "tax": True},
    {"symbol": "VT", "monthly": 5000, "start": "2016-01-01", "end": "2026-10-31", "dividends": True, "twd": True, "tax": True},
    {"symbol": "VT", "monthly": 5000, "start": "2016-01-01", "end": "2026-10-31", "dividends": True, "twd": False, "tax": False},
    {"symbol": "VT", "monthly": 5000, "start": "2016-01-01", "end": "2026-10-31", "dividends": False, "twd": True, "tax": False},
    {"symbol": "BND", "monthly": 2000, "start": "2018-06-01", "end": "2023-06-30", "dividends": True, "twd": True, "tax": True},
]

container = build_container()
OUT.mkdir(parents=True, exist_ok=True)
series = {}
for s in SYMBOLS:
    series[s] = export_series(container.prices, s, START, END)
    (OUT / f"{s}.json").write_text(json.dumps(series[s], separators=(",", ":")), encoding="utf-8")
    print(f"{s}: {len(series[s]['dates'])} 天，{series[s]['dates'][0]} ～ {series[s]['dates'][-1]}")
fx = export_fx(container.fx, START, END)
(OUT / "USDTWD.json").write_text(json.dumps(fx, separators=(",", ":")), encoding="utf-8")

# 標準答案：Python 讀回剛寫出的 JSON 計算（和瀏覽器吃同一份資料）
prices, rates = JsonPriceSource(series), JsonFxSource(fx)
golden = []
for sc in SCENARIOS:
    [r] = compare_dca(
        prices, [sc["symbol"]], monthly_amount=sc["monthly"],
        start=date.fromisoformat(sc["start"]), end=date.fromisoformat(sc["end"]),
        include_dividends=sc["dividends"], fx=rates if sc["twd"] else None,
        us_dividend_tax=US_DIVIDEND_TAX if sc["tax"] else 0.0,
    )
    w = worst_paper_loss(r)
    golden.append({
        "input": sc,
        "expected": {
            "totalInvested": r.total_invested,
            "finalValue": r.final_value,
            "annualized": r.annualized_return,
            "maxDrawdown": r.max_drawdown,
            "days": len(r.history),
            "worst": {
                "date": w.date.isoformat(), "invested": w.invested, "value": w.value,
                "recovered": w.recovered.isoformat() if w.recovered else None,
            },
        },
    })
GOLDEN.parent.mkdir(parents=True, exist_ok=True)
GOLDEN.write_text(json.dumps(golden, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"標準答案：{len(golden)} 組 → {GOLDEN}")
