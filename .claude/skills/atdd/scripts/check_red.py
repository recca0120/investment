#!/usr/bin/env python3
"""確認第一個驗收測試是「正確的紅燈」：因為功能還沒做而失敗。支援 pytest 與 Vitest。

正確：
  pytest：失敗在 NotImplementedError、斷言（assert / pytest.raises 沒有觸發）
  Vitest：失敗在 AssertionError（expect）、TestingLibraryElementError（畫面上還沒有這個元素）、NotImplementedError
不正確：import／載入失敗、TypeError 等其他例外、測試通過、測試被略過（含 test.todo）、測試還是範本、沒有測試

用法（在專案根目錄）：
    python3 .claude/skills/atdd/scripts/check_red.py "tests/acceptance/test_backtest.py::test_xxx"
    python3 .claude/skills/atdd/scripts/check_red.py "tests/site/acceptance/sidebar.test.ts::側欄 > [#15-1] 列出每一篇文章"

檔名是 *.test.ts / *.spec.ts（js、mjs、tsx 也算）時用 Vitest，否則用 pytest。
Vitest 的 :: 後面是測試的完整名稱（describe 與 test 名稱用 " > " 連接，和報告顯示的一樣）。

結束碼：0 = 正確的紅燈；1 = 不是
"""
from __future__ import annotations

import argparse
import re
import shlex
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

TEMPLATE_MARK = "TODO: 尚未撰寫"
VITEST_FILE = re.compile(r"\.(test|spec)\.[cm]?[jt]sx?$")
VITEST_GOOD = {
    "AssertionError": "斷言失敗",
    "TestingLibraryElementError": "畫面上找不到元素（功能尚未實作）",
    "NotImplementedError": "NotImplementedError（功能尚未實作）",
}


def classify_pytest(message: str) -> tuple[bool, str]:
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


def classify_vitest(kind: str, message: str) -> tuple[bool, str]:
    first = (message.splitlines() or [""])[0][:80]
    if TEMPLATE_MARK in message:
        return False, "測試還是範本，尚未寫入真正的斷言"
    if kind in VITEST_GOOD:
        return True, f"{VITEST_GOOD[kind]}：{first}"
    return False, f"{kind or '未知錯誤'}：測試在抵達斷言前就壞了（{first}）"


def js_escape(text: str) -> str:
    """跳脫 JavaScript 正規表示式的特殊字元（Vitest 的 -t 是正規表示式，測試名稱裡的 [#15-1] 要跳脫）。"""
    return re.sub(r"[.*+?^${}()|[\]\\/]", lambda m: "\\" + m.group(0), text)


def is_vitest(targets: list[str]) -> bool:
    return any(VITEST_FILE.search(t.split("::", 1)[0]) for t in targets)


def vitest_command(runner: str, targets: list[str], report: Path) -> list[str]:
    files, names = [], []
    for t in targets:
        file, _, name = t.partition("::")
        files.append(file)
        if name:
            names.append(js_escape(name))
    cmd = [*shlex.split(runner), *files]
    if names:
        cmd += ["-t", "|".join(names) if len(names) > 1 else names[0]]
    return [*cmd, "--reporter=junit", f"--outputFile={report}"]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("targets", nargs="+", help="要檢查的測試檔或 node id（Vitest：檔案::完整測試名稱）")
    ap.add_argument("--runner", help="執行測試的指令（預設：pytest 用 uv run pytest；Vitest 用 npx vitest run）")
    args = ap.parse_args(argv)
    vitest = is_vitest(args.targets)

    with tempfile.TemporaryDirectory() as tmp:
        report = Path(tmp) / "report.xml"
        if vitest:
            cmd = vitest_command(args.runner or "npx vitest run", args.targets, report)
        else:
            runner = args.runner or "uv run pytest"
            cmd = [*shlex.split(runner), *args.targets, "-q", "-p", "no:cacheprovider", f"--junitxml={report}"]
        proc = subprocess.run(cmd, capture_output=True, text=True)

        if not vitest and proc.returncode == 5:
            print("❌ 不是正確的紅燈：沒有收集到任何測試，請確認路徑與測試函式名稱（test_ 開頭）")
            return 1
        if not report.exists() or (not vitest and proc.returncode in (2, 3, 4)):
            print("❌ 不是正確的紅燈：測試在收集階段就失敗（import 錯誤、語法錯誤或設定錯誤），測試根本沒有執行")
            print("   先建立只有簽名、內容丟出 NotImplementedError 的骨架，讓測試可以 import")
            print("\n".join("   " + line for line in (proc.stdout + proc.stderr).strip().splitlines()[-15:]))
            return 1

        good: list[str] = []
        bad: list[str] = []
        cases = list(ET.parse(report).iter("testcase"))
        if not cases:
            print("❌ 不是正確的紅燈：沒有執行到任何測試，請確認檔案路徑與測試名稱")
            return 1
        for tc in cases:
            name = f"{tc.get('classname')}::{tc.get('name')}"
            # 只看結果元素：<system-out>／<system-err> 可能排在 <failure> 前面
            result = next((c for c in tc if c.tag in ("failure", "error", "skipped")), None)
            if result is None:
                bad.append(f"{name}：測試直接通過（還沒寫實作就通過，代表斷言沒有驗證到東西）")
            elif result.tag == "skipped":
                bad.append(f"{name}：測試被略過（skip 或 todo）")
            elif vitest and tc.get("name") == tc.get("classname"):
                # Vitest 在測試檔 import 失敗時，用檔名當作 testcase 名稱
                bad.append(f"{name}：測試檔載入失敗，測試根本沒有執行（{(result.get('message') or '')[:80]}）")
            elif result.tag == "error":
                bad.append(f"{name}：fixture／setup 錯誤（{(result.get('message') or '')[:80]}）")
            else:
                message = result.get("message") or ""
                ok, why = classify_vitest(result.get("type") or "", message) if vitest else classify_pytest(message)
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
