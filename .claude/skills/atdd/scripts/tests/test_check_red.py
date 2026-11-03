"""驗收測試：check_red.py 判斷「第一個驗收測試的紅燈原因是否正確」"""
import subprocess
import sys
import textwrap
from pathlib import Path

SCRIPT = Path(__file__).parents[1] / "check_red.py"
RUNNER = f"{sys.executable} -m pytest -p no:cacheprovider"


def write(project: Path, files: dict[str, str]) -> None:
    for name, body in files.items():
        p = project / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(textwrap.dedent(body))


def check_red(project: Path, target: str = "tests") -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), target, "--runner", RUNNER],
        cwd=project, capture_output=True, text=True,
    )


SKELETON = """
    def add(a, b):
        raise NotImplementedError
"""


def test_失敗在_NotImplementedError_是正確的紅燈(tmp_path):
    write(tmp_path, {
        "calc.py": SKELETON,
        "tests/test_calc.py": """
            from calc import add
            def test_加法():
                assert add(1, 2) == 3
        """,
    })
    r = check_red(tmp_path)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "正確的紅燈" in r.stdout


def test_失敗在斷言是正確的紅燈(tmp_path):
    write(tmp_path, {
        "calc.py": "def add(a, b):\n    return 0\n",
        "tests/test_calc.py": """
            from calc import add
            def test_加法():
                assert add(1, 2) == 3
        """,
    })
    r = check_red(tmp_path)
    assert r.returncode == 0, r.stdout + r.stderr


def test_import_失敗不算紅燈_並說明原因(tmp_path):
    write(tmp_path, {
        "tests/test_calc.py": """
            from calc import add
            def test_加法():
                assert add(1, 2) == 3
        """,
    })
    r = check_red(tmp_path)
    assert r.returncode == 1
    assert "不是正確的紅燈" in r.stdout
    assert "收集" in r.stdout  # 告訴使用者：測試根本沒被收集執行


def test_測試直接通過也不算紅燈(tmp_path):
    write(tmp_path, {
        "calc.py": "def add(a, b):\n    return a + b\n",
        "tests/test_calc.py": """
            from calc import add
            def test_加法():
                assert add(1, 2) == 3
        """,
    })
    r = check_red(tmp_path)
    assert r.returncode == 1
    assert "通過" in r.stdout


def test_簽名不符的_TypeError_不算紅燈(tmp_path):
    write(tmp_path, {
        "calc.py": "def add(a):\n    raise NotImplementedError\n",
        "tests/test_calc.py": """
            from calc import add
            def test_加法():
                assert add(1, 2) == 3
        """,
    })
    r = check_red(tmp_path)
    assert r.returncode == 1
    assert "TypeError" in r.stdout


def test_還是範本的測試不算紅燈(tmp_path):
    write(tmp_path, {
        "calc.py": SKELETON,
        "tests/test_calc.py": """
            import pytest
            def test_加法():
                pytest.fail("TODO: 尚未撰寫此驗收條件的測試")
        """,
    })
    r = check_red(tmp_path)
    assert r.returncode == 1
    assert "範本" in r.stdout


def test_找不到任何測試不算紅燈(tmp_path):
    write(tmp_path, {"tests/test_empty.py": "x = 1\n"})
    r = check_red(tmp_path)
    assert r.returncode == 1
    assert "沒有" in r.stdout
