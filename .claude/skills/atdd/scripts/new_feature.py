#!/usr/bin/env python3
"""開始一個新功能：產生「會丟 NotImplementedError 的骨架」與「驗收測試範本」。

範本只是起點：接著要把第一個測試改寫成真正的驗收測試（這一步就是在設計 API），
用 check_red.py 確認紅燈原因正確，再開始寫實作。

用法（在專案根目錄）：
    python3 .claude/skills/atdd/scripts/new_feature.py backtest --entry run_dca --issue 5
    python3 .claude/skills/atdd/scripts/new_feature.py holdings --entry load_holdings

有 --issue 時，會從 issue 的「驗收條件」段落為每一條產生一個測試範本。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _criteria import TEMPLATE_MARK, criterion_id, load_issue_body, parse_criteria

MODULE_TEMPLATE = '''"""{module}{issue_note}"""


def {entry}(*args, **kwargs):
    # 先寫第一個驗收測試，依照測試中的呼叫方式改寫這個簽名，再開始實作
    raise NotImplementedError
'''

TEST_HEADER = '''"""驗收測試：{module}{issue_note}

預期值請手算，並在註解寫下計算過程。
"""
import pytest

from {package}.{module} import {entry}
'''

TEST_CASE = '''

{marker}def test_{name}():
    # Given
    # When
    # Then
    # 驗收條件：{criterion}
    pytest.fail("{todo}此驗收條件的測試")
'''


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("module", help="模組名稱，例如 backtest")
    ap.add_argument("--entry", required=True, help="公開入口函式名稱，例如 run_dca")
    ap.add_argument("--issue", type=int, help="對應的 issue 編號")
    ap.add_argument("--repo", help="GitHub repo（owner/name），預設為目前目錄的 repo")
    ap.add_argument("--body-file", help="從檔案讀取 issue 內文（離線或測試用）")
    ap.add_argument("--package", default="invest")
    ap.add_argument("--src", default="src")
    ap.add_argument("--tests", default="tests/acceptance")
    args = ap.parse_args(argv)

    module_path = Path(args.src) / args.package / f"{args.module}.py"
    test_path = Path(args.tests) / f"test_{args.module}.py"
    existing = [str(p) for p in (module_path, test_path) if p.exists()]
    if existing:
        print(f"檔案已存在，不覆蓋：{', '.join(existing)}")
        return 1

    criteria = parse_criteria(load_issue_body(args.issue, args.repo, args.body_file)) if args.issue else []
    issue_note = f"（issue #{args.issue}）" if args.issue else ""

    cases = []
    if criteria:
        for n, text in enumerate(criteria, start=1):
            cid = criterion_id(args.issue, n)
            cases.append(TEST_CASE.format(
                marker=f'@pytest.mark.criteria("{cid}")\n', name=f"驗收條件_{n}_請改成情境與預期結果",
                criterion=text, todo=TEMPLATE_MARK))
    else:
        cases.append(TEST_CASE.format(marker="", name="請改成情境與預期結果", criterion="（請填寫）", todo=TEMPLATE_MARK))

    module_path.parent.mkdir(parents=True, exist_ok=True)
    test_path.parent.mkdir(parents=True, exist_ok=True)
    init = module_path.parent / "__init__.py"
    if not init.exists():
        init.write_text("")
    module_path.write_text(MODULE_TEMPLATE.format(module=args.module, issue_note=issue_note, entry=args.entry))
    test_path.write_text(
        TEST_HEADER.format(module=args.module, issue_note=issue_note, package=args.package, entry=args.entry)
        + "".join(cases)
    )

    print(f"已建立：{module_path}")
    print(f"已建立：{test_path}（{len(cases)} 個測試範本）")
    print("下一步：")
    print("  1. 把第一個測試改寫成真正的驗收測試（決定 API 的呼叫方式），並同步修改骨架簽名")
    print(f'  2. python3 .claude/skills/atdd/scripts/check_red.py "{test_path}::<第一個測試名稱>"')
    if criteria:
        print('  3. 確認 pyproject.toml 已註冊 marker：markers = ["criteria(id): 對應 issue 驗收條件"]')
    return 0


if __name__ == "__main__":
    sys.exit(main())
