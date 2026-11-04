#!/usr/bin/env python3
"""匯出首頁「定期定額存摺」用的資料（真實回測結果）到 site/data/passbook.json。

用法：uv run python scripts/export_passbook.py
需要連網（FinMind），結果會快取在 data/cache/。資料更新時手動重跑並 commit。
"""
from datetime import date
from pathlib import Path

from invest.backtest import run_dca
from invest.container import build_container
from invest.export import write_json

SYMBOL, AMOUNT, START, END = "0050", 5000, date(2016, 1, 1), date(2026, 10, 31)

result = run_dca(build_container().prices, SYMBOL, monthly_amount=AMOUNT, start=START, end=END)
deposits = [h for i, h in enumerate(result.history) if i == 0 or h.invested != result.history[i - 1].invested]
yearly = [h for i, h in enumerate(deposits) if i == 0 or h.date.year != deposits[i - 1].date.year]
rows = [{"date": h.date.isoformat(), "deposit": AMOUNT, "invested": h.invested, "value": round(h.value)} for h in yearly]
last = result.history[-1]
rows.append({"date": last.date.isoformat(), "deposit": None, "invested": last.invested, "value": round(last.value)})

out = {
    "symbol": SYMBOL,
    "monthly": AMOUNT,
    "start": START.isoformat(),
    "end": last.date.isoformat(),
    "months": len(deposits),
    "invested": result.total_invested,
    "final": round(result.final_value),
    "annualized": result.annualized_return,
    "maxDrawdown": result.max_drawdown,
    "rows": rows,
}
path = Path("site/data/passbook.json")
write_json(path, out, indent=2)  # 不允許 NaN（#46）
print(f"{path}: {len(rows)} 列，期末 {out['final']:,}，年化 {out['annualized']:.1%}")
