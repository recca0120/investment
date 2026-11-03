#!/usr/bin/env python3
"""確認第一個驗收測試是「正確的紅燈」：因為功能還沒做而失敗。

正確：失敗在 NotImplementedError、斷言（assert / pytest.raises 沒有觸發）
不正確：import／collection 失敗、TypeError 等其他例外、測試通過、測試還是範本、沒有測試

用法（在專案根目錄）：
    python3 .claude/skills/atdd/scripts/check_red.py tests/acceptance/test_backtest.py
    python3 .claude/skills/atdd/scripts/check_red.py <路徑> --runner "uv run pytest"

結束碼：0 = 正確的紅燈；1 = 不是
"""
from __future__ import annotations

import argparse
import shlex
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

TEMPLATE_MARK = "TODO: 尚未撰寫"


def classify(message: str) -> tuple[bool, str]:
    """回傳 (是否為正確的紅燈, 說明)。"""
    if TEMPLATE_MARK in message:
        return False, "測試還是範本，尚未寫入真正的斷言"
    if message.startswith("NotImplementedError"):
        return True, "NotImplementedError（功能尚未實作）"
    if message.startswith(("assert ", "AssertionError")):
        return True, f"斷言失敗：{message.splitlines()[0][:80]}"
    if message.startswith("Failed:"):  # pytest.fail()、pytest.raises 沒有觸發
        return True, message.splitlines()[0][:80]
    kind = message.split(":", 1)[0].strip() or "未知錯誤"
    return False, f"{kind}：測試在抵達斷言前就壞了（{message.splitlines()[0][:80]}）"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("targets", nargs="+", help="要檢查的測試檔或 node id")
    ap.add_argument("--runner", default="uv run pytest", help="執行 pytest 的指令（預設：uv run pytest）")
    args = ap.parse_args(argv)

    with tempfile.TemporaryDirectory() as tmp:
        report = Path(tmp) / "report.xml"
        cmd = [*shlex.split(args.runner), *args.targets, "-q", "-p", "no:cacheprovider", f"--junitxml={report}"]
        proc = subprocess.run(cmd, capture_output=True, text=True)

        if proc.returncode == 5:
            print("❌ 不是正確的紅燈：沒有收集到任何測試，請確認路徑與測試函式名稱（test_ 開頭）")
            return 1
        if proc.returncode in (2, 3, 4) or not report.exists():
            print("❌ 不是正確的紅燈：測試在收集階段就失敗（import 錯誤、語法錯誤或設定錯誤），測試根本沒有執行")
            print("   先建立只有簽名、內容 raise NotImplementedError 的骨架，讓測試可以 import")
            print("\n".join("   " + line for line in (proc.stdout + proc.stderr).strip().splitlines()[-15:]))
            return 1

        good: list[str] = []
        bad: list[str] = []
        for tc in ET.parse(report).iter("testcase"):
            name = f"{tc.get('classname')}::{tc.get('name')}"
            result = next(iter(tc), None)
            if result is None:
                bad.append(f"{name}：測試直接通過（還沒寫實作就通過，代表斷言沒有驗證到東西）")
            elif result.tag == "skipped":
                bad.append(f"{name}：測試被略過")
            elif result.tag == "error":
                bad.append(f"{name}：fixture／setup 錯誤（{(result.get('message') or '')[:80]}）")
            else:
                ok, why = classify(result.get("message") or "")
                (good if ok else bad).append(f"{name}：{why}")

    if bad:
        print("❌ 不是正確的紅燈：")
        print("\n".join(f"   - {line}" for line in bad))
        if good:
            print("   以下是正確的紅燈：")
            print("\n".join(f"   - {line}" for line in good))
        return 1
    print(f"✅ 正確的紅燈：{len(good)} 個測試都因為功能還沒做而失敗")
    print("\n".join(f"   - {line}" for line in good))
    return 0


if __name__ == "__main__":
    sys.exit(main())
