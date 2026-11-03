#!/usr/bin/env python3
"""確認 issue 的每一條驗收條件都有對應的驗收測試（PR 合併前執行）。

測試用 @pytest.mark.criteria("#<issue>-<序號>") 標記對應的驗收條件；
還停留在範本（含「TODO: 尚未撰寫」）的測試不算數。

用法（在專案根目錄）：
    GH_TOKEN=$(gh auth token -u recca0120) python3 .claude/skills/atdd/scripts/check_criteria.py 5
    python3 .claude/skills/atdd/scripts/check_criteria.py 5 --body-file issue.md

結束碼：0 = 全部都有測試；1 = 有缺漏
"""
from __future__ import annotations

import argparse
import ast
import sys
from pathlib import Path

from _criteria import TEMPLATE_MARK, criterion_id, load_issue_body, parse_criteria


def criteria_ids(decorator: ast.expr) -> list[str]:
    """從 @pytest.mark.criteria("#5-1") 取出 "#5-1"。"""
    if (
        isinstance(decorator, ast.Call)
        and isinstance(decorator.func, ast.Attribute)
        and decorator.func.attr == "criteria"
    ):
        return [a.value for a in decorator.args if isinstance(a, ast.Constant) and isinstance(a.value, str)]
    return []


def scan_tests(tests_dir: Path) -> dict[str, list[tuple[str, bool]]]:
    """回傳 {驗收條件編號: [(測試名稱, 是否還是範本)]}。"""
    found: dict[str, list[tuple[str, bool]]] = {}
    for path in sorted(tests_dir.rglob("test_*.py")):
        source = path.read_text()
        for node in ast.walk(ast.parse(source, filename=str(path))):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            is_template = TEMPLATE_MARK in (ast.get_source_segment(source, node) or "")
            for dec in node.decorator_list:
                for cid in criteria_ids(dec):
                    found.setdefault(cid, []).append((f"{path}::{node.name}", is_template))
    return found


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("issue", type=int)
    ap.add_argument("--repo", help="GitHub repo（owner/name），預設為目前目錄的 repo")
    ap.add_argument("--body-file", help="從檔案讀取 issue 內文（離線或測試用）")
    ap.add_argument("--tests", default="tests", help="測試目錄（預設：tests）")
    args = ap.parse_args(argv)

    criteria = parse_criteria(load_issue_body(args.issue, args.repo, args.body_file))
    if not criteria:
        print(f"❌ issue #{args.issue} 沒有找到驗收條件：需要一個標題含「驗收條件」的段落，底下用 - [ ] 列出每一條")
        return 1

    tests = scan_tests(Path(args.tests)) if Path(args.tests).exists() else {}
    done = 0
    lines = []
    for n, text in enumerate(criteria, start=1):
        cid = criterion_id(args.issue, n)
        real = [name for name, tmpl in tests.get(cid, []) if not tmpl]
        templates = [name for name, tmpl in tests.get(cid, []) if tmpl]
        if real:
            done += 1
            lines.append(f"  ✅ {cid} {text}\n       {', '.join(real)}")
        elif templates:
            lines.append(f"  ❌ {cid} {text}\n       測試還是範本：{', '.join(templates)}")
        else:
            lines.append(f"  ❌ {cid} {text}\n       沒有對應的測試")

    known = {criterion_id(args.issue, n) for n in range(1, len(criteria) + 1)}
    unknown = sorted(c for c in tests if c.startswith(f"#{args.issue}-") and c not in known)

    status = "✅" if done == len(criteria) else "❌"
    print(f"{status} issue #{args.issue} 驗收條件：{done}/{len(criteria)} 有測試")
    print("\n".join(lines))
    if unknown:
        print(f"  ⚠️ 測試標記了 issue 上不存在的編號：{', '.join(unknown)}（issue 的條件順序是否被調整過？）")
    return 0 if done == len(criteria) else 1


if __name__ == "__main__":
    sys.exit(main())
