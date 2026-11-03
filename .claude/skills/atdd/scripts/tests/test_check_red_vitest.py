"""驗收測試：check_red.py 判斷 Vitest 測試的紅燈原因

用假的 runner 代替真正的 Vitest：它把事先準備好的 junit 報告寫到 --outputFile，
並記錄收到的參數，這樣不需要在暫存目錄安裝 node_modules。
junit 的格式取自 Vitest 5.1 的實際輸出（2026-11-03）。
"""
import json
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

SCRIPT = Path(__file__).parents[1] / "check_red.py"
TARGET = "tests/site/sidebar.test.ts::側欄 > [#15-1] 列出每一篇文章"

FAKE_VITEST = """
    import json, sys
    from pathlib import Path
    args = sys.argv[1:]
    Path("argv.json").write_text(json.dumps(args))
    out = next(a.split("=", 1)[1] for a in args if a.startswith("--outputFile="))
    Path(out).write_text(Path("junit.xml").read_text())
    sys.exit(1)
"""


def junit_case(body: str, name: str = "側欄 &gt; [#15-1] 列出每一篇文章") -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" ?>
<testsuites name="vitest tests">
  <testsuite name="tests/site/sidebar.test.ts">
    <testcase classname="tests/site/sidebar.test.ts" name="{name}" time="0.01">{body}</testcase>
  </testsuite>
</testsuites>
"""


def check_red(tmp_path: Path, junit: str) -> subprocess.CompletedProcess:
    (tmp_path / "fake_vitest.py").write_text(textwrap.dedent(FAKE_VITEST))
    (tmp_path / "junit.xml").write_text(junit)
    return subprocess.run(
        [sys.executable, str(SCRIPT), TARGET, "--runner", f"{sys.executable} fake_vitest.py"],
        cwd=tmp_path, capture_output=True, text=True,
    )


def failure(type_: str, message: str) -> str:
    return f'<failure message="{message}" type="{type_}">{type_}: {message}</failure>'


def test_斷言失敗是正確的紅燈(tmp_path):
    r = check_red(tmp_path, junit_case(failure("AssertionError", "expected 1 to be 2")))
    assert r.returncode == 0, r.stdout + r.stderr
    assert "正確的紅燈" in r.stdout


@pytest.mark.criteria("#15-10")
def test_Testing_Library_找不到元素是正確的紅燈(tmp_path):
    # 畫面上還沒有這個元素，等同於「功能還沒做」
    r = check_red(tmp_path, junit_case(failure("TestingLibraryElementError", "Unable to find an accessible element with the role &quot;link&quot;")))
    assert r.returncode == 0, r.stdout + r.stderr


def test_NotImplementedError_是正確的紅燈(tmp_path):
    r = check_red(tmp_path, junit_case(failure("NotImplementedError", "loadBacktest")))
    assert r.returncode == 0, r.stdout + r.stderr


def test_TypeError_不算紅燈(tmp_path):
    r = check_red(tmp_path, junit_case(failure("TypeError", "Cannot read properties of undefined")))
    assert r.returncode == 1
    assert "TypeError" in r.stdout


def test_測試檔載入失敗不算紅燈(tmp_path):
    # Vitest 在 import 失敗時，用檔名當作 testcase 名稱回報
    r = check_red(tmp_path, junit_case(failure("Error", "Cannot find module './nope'"), name="tests/site/sidebar.test.ts"))
    assert r.returncode == 1
    assert "載入" in r.stdout


def test_測試直接通過不算紅燈(tmp_path):
    r = check_red(tmp_path, junit_case(""))
    assert r.returncode == 1
    assert "通過" in r.stdout


def test_還是範本或_todo_不算紅燈(tmp_path):
    r = check_red(tmp_path, junit_case(failure("Error", "TODO: 尚未撰寫此驗收條件的測試")))
    assert r.returncode == 1
    assert "範本" in r.stdout
    r = check_red(tmp_path, junit_case("<skipped/>"))
    assert r.returncode == 1
    assert "略過" in r.stdout


def test_找不到測試不算紅燈(tmp_path):
    r = check_red(tmp_path, '<?xml version="1.0" ?><testsuites name="vitest tests"></testsuites>')
    assert r.returncode == 1
    assert "沒有" in r.stdout


def test_只執行指定的測試_名稱中的特殊字元會跳脫(tmp_path):
    check_red(tmp_path, junit_case(failure("AssertionError", "x")))
    args = json.loads((tmp_path / "argv.json").read_text())
    assert "tests/site/sidebar.test.ts" in args
    pattern = args[args.index("-t") + 1]
    assert pattern == r"側欄 > \[#15-1\] 列出每一篇文章"


def test_測試有輸出時_system_out_不影響判斷(tmp_path):
    # 實際案例：元件印出警告時，Vitest 把 <system-out> 放在 <failure> 前面
    out = "<system-out>[WARN] [content] collection is empty</system-out>"
    r = check_red(tmp_path, junit_case(out + failure("TestingLibraryElementError", "Unable to find role")))
    assert r.returncode == 0, r.stdout + r.stderr
    r = check_red(tmp_path, junit_case(out))
    assert r.returncode == 1
    assert "通過" in r.stdout
