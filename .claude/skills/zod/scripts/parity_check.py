#!/usr/bin/env python3
"""檢查網頁（zod）和 Python（Pydantic）對同一份資料的判斷是否一致。

拿一份「正確的資料」，自動做出邊界情況（多一個欄位、少一個欄位、值設成 null、日期格式錯、
數字改成字串、整數改成小數），分別交給 zod 和 Pydantic 驗證，列出兩邊判斷不同的地方。
新增或修改 site/lib/schemas.ts 後、或懷疑兩邊行為不同時執行。

用法（在 repo 根目錄）：
    uv run python .claude/skills/zod/scripts/parity_check.py price-series public/data/prices/VT.json
    uv run python .claude/skills/zod/scripts/parity_check.py backtest-golden tests/site/fixtures/backtest-golden.json

第一個參數是 schemas/ 裡的檔名（不含 .schema.json）；Pydantic 模型取 src/invest/schemas/<底線名稱>.py 的 Model。
結束碼：0 = 兩邊全部一致；1 = 有不一致
"""
from __future__ import annotations

import copy
import importlib
import json
import re
import subprocess
import sys
from pathlib import Path

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HERE = Path(__file__).parent


def variants(sample):
    """產生邊界情況：(說明, 資料)。根是陣列時改第一個元素。"""
    out = [("原始資料", sample)]
    target_is_list = isinstance(sample, list)
    base = sample[0] if target_is_list else sample
    if not isinstance(base, dict):
        return out

    def make(desc, mutate):
        data = copy.deepcopy(sample)
        mutate(data[0] if target_is_list else data)
        out.append((desc, data))

    make("多一個欄位 __extra__", lambda d: d.__setitem__("__extra__", 1))
    for key, value in base.items():
        make(f"少了 {key}", lambda d, k=key: d.pop(k))
        make(f"{key} 設成 null", lambda d, k=key: d.__setitem__(k, None))
        first = value[0] if isinstance(value, list) and value else value
        if isinstance(first, str) and ISO_DATE.match(first):
            def bad_date(d, k=key):
                if isinstance(d[k], list):
                    d[k][0] = d[k][0].replace("-", "/")
                else:
                    d[k] = d[k].replace("-", "/")
            make(f"{key} 日期格式錯（YYYY/MM/DD）", bad_date)

            def date_as_number(d, k=key):
                if isinstance(d[k], list):
                    d[k][0] = 20250102
                else:
                    d[k] = 20250102
            make(f"{key} 日期改成數字", date_as_number)
        if isinstance(first, (int, float)) and not isinstance(first, bool):
            def to_str(d, k=key):
                if isinstance(d[k], list):
                    d[k][0] = str(d[k][0])
                else:
                    d[k] = str(d[k])
            make(f"{key} 數字改成字串", to_str)
            if isinstance(value, int):
                make(f"{key} 整數改成小數 1.5", lambda d, k=key: d.__setitem__(k, 1.5))
        if isinstance(value, dict):
            make(f"{key} 裡多一個欄位", lambda d, k=key: d[k].__setitem__("__extra__", 1))
    return out


def pydantic_results(schema: str, values):
    module = importlib.import_module(f"invest.schemas.{schema.replace('-', '_')}")
    results = []
    for v in values:
        try:
            module.Model.model_validate(v)
            results.append({"ok": True})
        except Exception as e:  # noqa: BLE001 - 只要知道接受或拒絕
            results.append({"ok": False, "why": str(e).splitlines()[0]})
    return results


def zod_results(schema: str, values):
    proc = subprocess.run(
        ["node", str(HERE / "zod-check.ts"), f"{schema}.schema.json"],
        input=json.dumps(values), capture_output=True, text=True,
    )
    if proc.returncode != 0:
        sys.exit(f"zod 端執行失敗：{proc.stderr.strip()}")
    return json.loads(proc.stdout.strip().splitlines()[-1])


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    schema, sample_path = argv
    sample = json.loads(Path(sample_path).read_text(encoding="utf-8"))
    cases = variants(sample)
    data = [d for _, d in cases]
    py, js = pydantic_results(schema, data), zod_results(schema, data)

    mismatches = 0
    for (desc, _), p, z in zip(cases, py, js):
        same = p["ok"] == z["ok"]
        mismatches += not same
        mark = "✅" if same else "❌"
        verdict = lambda r: "接受" if r["ok"] else "拒絕"
        print(f"{mark} {desc}：Pydantic {verdict(p)}、zod {verdict(z)}")
        if not same:
            for side, r in (("Pydantic", p), ("zod", z)):
                if not r["ok"]:
                    print(f"     {side}：{r['why'][:120]}")
    print(f"\n{'❌' if mismatches else '✅'} {len(cases)} 種情況，{mismatches} 種兩邊判斷不同")
    return 1 if mismatches else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
