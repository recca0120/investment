"""讀取 issue 的驗收條件（new_feature.py 與 check_criteria.py 共用）。

驗收條件格式：issue 內標題含「驗收條件」的段落，底下每一行 checkbox 是一條條件，
依出現順序編號為 #<issue>-1、#<issue>-2 …。新增條件請加在最後，不要調整順序，否則編號會錯位。
"""
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

TEMPLATE_MARK = "TODO: 尚未撰寫"
_HEADING = re.compile(r"^#{1,6}\s")
_CHECKBOX = re.compile(r"^\s*[-*]\s+\[[ xX]\]\s+(.+?)\s*$")


def parse_criteria(body: str) -> list[str]:
    criteria: list[str] = []
    in_section = False
    for line in body.splitlines():
        if _HEADING.match(line):
            in_section = "驗收條件" in line
            continue
        if in_section and (m := _CHECKBOX.match(line)):
            criteria.append(m.group(1))
    return criteria


def load_issue_body(issue: int, repo: str | None, body_file: str | None) -> str:
    if body_file:
        return Path(body_file).read_text()
    cmd = ["gh", "issue", "view", str(issue), "--json", "body", "-q", ".body"]
    if repo:
        cmd += ["-R", repo]
    proc = subprocess.run(cmd, capture_output=True, text=True, env=os.environ.copy())
    if proc.returncode != 0:
        raise SystemExit(f"讀取 issue #{issue} 失敗：{proc.stderr.strip()}")
    return proc.stdout


def criterion_id(issue: int, n: int) -> str:
    return f"#{issue}-{n}"
