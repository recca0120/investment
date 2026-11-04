"""驗收測試：new_feature.py（產生骨架與測試範本）、check_criteria.py（驗收條件都有測試）"""
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).parents[1]

ISSUE_BODY = textwrap.dedent("""\
    ## 目的
    親眼看到定期定額的報酬與波動。

    ## 驗收條件
    - [ ] 給定標的、每月金額、起訖日期，計算總投入與期末市值
    - [x] 顯示最大跌幅（MDD）
    - [ ] 查不到代號時回報錯誤

    ## 依賴
    - [ ] 資料來源研究 issue
""")


def run(script: str, *args: str, cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(SCRIPTS / script), *args], cwd=cwd, capture_output=True, text=True)


def issue_file(tmp_path: Path) -> str:
    f = tmp_path / "issue5.md"
    f.write_text(ISSUE_BODY)
    return str(f)


# ---------- new_feature.py ----------

def test_new_feature_產生會丟_NotImplementedError_的骨架與每條驗收條件的測試範本(tmp_path):
    r = run("new_feature.py", "backtest", "--entry", "run_dca", "--issue", "5",
            "--body-file", issue_file(tmp_path), cwd=tmp_path)
    assert r.returncode == 0, r.stdout + r.stderr

    module = (tmp_path / "src/invest/backtest.py").read_text()
    assert "def run_dca(" in module
    assert "raise NotImplementedError" in module

    test = (tmp_path / "tests/acceptance/test_backtest.py").read_text()
    assert "from invest.backtest import run_dca" in test
    # 只取「驗收條件」段落，依賴段落的 checkbox 不算
    for n, text in enumerate(["計算總投入與期末市值", "顯示最大跌幅", "查不到代號時回報錯誤"], start=1):
        assert f'@pytest.mark.criteria("#5-{n}")' in test
        assert text in test
    assert "資料來源研究" not in test
    assert test.count("TODO: 尚未撰寫") == 3


def test_new_feature_沒有_issue_時產生單一測試範本(tmp_path):
    r = run("new_feature.py", "holdings", "--entry", "load_holdings", cwd=tmp_path)
    assert r.returncode == 0, r.stdout + r.stderr
    test = (tmp_path / "tests/acceptance/test_holdings.py").read_text()
    assert test.count("def test_") == 1
    assert "TODO: 尚未撰寫" in test


def test_new_feature_不會覆蓋既有檔案(tmp_path):
    target = tmp_path / "src/invest/backtest.py"
    target.parent.mkdir(parents=True)
    target.write_text("# 既有程式\n")
    r = run("new_feature.py", "backtest", "--entry", "run_dca", cwd=tmp_path)
    assert r.returncode == 1
    assert target.read_text() == "# 既有程式\n"
    assert "已存在" in r.stdout


# ---------- check_criteria.py ----------

def write_test(tmp_path: Path, body: str) -> None:
    p = tmp_path / "tests/acceptance/test_backtest.py"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(textwrap.dedent(body))


def test_check_criteria_每條驗收條件都有測試時通過(tmp_path):
    write_test(tmp_path, """
        import pytest

        @pytest.mark.criteria("#5-1")
        def test_計算總投入():
            assert True

        @pytest.mark.criteria("#5-2")
        @pytest.mark.criteria("#5-3")
        def test_跌幅與錯誤():
            assert True
    """)
    r = run("check_criteria.py", "5", "--body-file", issue_file(tmp_path), cwd=tmp_path)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "3/3" in r.stdout


def test_check_criteria_列出缺少測試與還是範本的驗收條件(tmp_path):
    write_test(tmp_path, """
        import pytest

        @pytest.mark.criteria("#5-1")
        def test_計算總投入():
            assert True

        @pytest.mark.criteria("#5-2")
        def test_最大跌幅():
            pytest.fail("TODO: 尚未撰寫此驗收條件的測試")
    """)
    r = run("check_criteria.py", "5", "--body-file", issue_file(tmp_path), cwd=tmp_path)
    assert r.returncode == 1
    lines = r.stdout
    assert "1/3" in lines
    assert "#5-2" in lines and "範本" in lines
    assert "#5-3" in lines and "查不到代號時回報錯誤" in lines


def test_check_criteria_issue_沒有驗收條件時提醒(tmp_path):
    f = tmp_path / "empty.md"
    f.write_text("## 目的\n沒有驗收條件\n")
    r = run("check_criteria.py", "9", "--body-file", str(f), cwd=tmp_path)
    assert r.returncode == 1
    assert "沒有找到驗收條件" in r.stdout


@pytest.mark.criteria("#15-10")
def test_check_criteria_也辨識_Vitest_測試名稱開頭的編號(tmp_path):
    write_test(tmp_path, """
        import pytest

        @pytest.mark.criteria("#5-1")
        def test_計算總投入():
            assert True
    """)
    ts = tmp_path / "tests/site/backtest.test.ts"
    ts.parent.mkdir(parents=True)
    ts.write_text(textwrap.dedent("""\
        import { describe, expect, it, test } from 'vitest';

        describe('回測頁', () => {
          test('[#5-2] 顯示最大跌幅', () => {
            expect(1).toBe(1);
          });
          it.todo("[#5-3] 查不到代號時回報錯誤");
        });
    """))
    r = run("check_criteria.py", "5", "--body-file", issue_file(tmp_path), cwd=tmp_path)
    assert r.returncode == 1
    assert "2/3" in r.stdout
    assert "backtest.test.ts" in r.stdout
    assert "#5-3" in r.stdout and "範本" in r.stdout  # test.todo 還不算數


def test_check_criteria_Vitest_測試內容還是範本時不算數(tmp_path):
    ts = tmp_path / "tests/site/backtest.test.ts"
    ts.parent.mkdir(parents=True)
    ts.write_text(textwrap.dedent("""\
        import { expect, test } from 'vitest';
        test('[#5-1] 計算總投入', () => {
          throw new Error('TODO: 尚未撰寫此驗收條件的測試');
        });
        test('[#5-2] 顯示最大跌幅', () => expect(1).toBe(1));
        test.each(['0050', 'VT'])(`[#5-3] %s 查不到代號`, async (code) => {
          expect(code).toBeTruthy();
        });
    """))
    r = run("check_criteria.py", "5", "--body-file", issue_file(tmp_path), cwd=tmp_path)
    assert r.returncode == 1
    assert "2/3" in r.stdout
    assert "#5-1" in r.stdout and "範本" in r.stdout


def test_check_criteria_Vitest_each_的參數裡有函式呼叫也認得(tmp_path):
    # 實際案例（#24）：test.each(files())(…) 的巢狀括號讓正規表示式對不上，測試明明有卻回報沒有
    ts = tmp_path / "tests/site/glossary.test.ts"
    ts.parent.mkdir(parents=True)
    ts.write_text(textwrap.dedent("""\
        import { expect, test } from 'vitest';
        const files = () => ['a.md', 'b.md'];
        test('[#5-1] 計算總投入', () => expect(1).toBe(1));
        test.each(files())('[#5-2] %s 有四項', (f) => expect(f).toBeTruthy());
        describe.each([['x', 1]])('%s', () => {});
        test.each(rows.filter((r) => r.ok))('[#5-3] %s', (r) => expect(r).toBeTruthy());
    """))
    r = run("check_criteria.py", "5", "--body-file", issue_file(tmp_path), cwd=tmp_path)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "3/3" in r.stdout


def test_check_criteria_一個測試對應多條驗收條件(tmp_path):
    # 實際案例（#60）：全站測試 test('[#58-3][#60-2] …') 同時驗證兩條，只認第一個會回報 #60-2 沒有測試
    ts = tmp_path / "tests/site/site-wide.test.ts"
    ts.parent.mkdir(parents=True)
    ts.write_text(textwrap.dedent("""\
        import { expect, test } from 'vitest';
        test('[#5-1] 計算總投入', () => expect(1).toBe(1));
        test.each([1])('[#4-3][#5-2] %s 表格', (n) => expect(n).toBe(1));
        test('[#5-3] [#9-1] 有空白也認得', () => expect(1).toBe(1));
    """))
    r = run("check_criteria.py", "5", "--body-file", issue_file(tmp_path), cwd=tmp_path)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "3/3" in r.stdout


def test_check_criteria_可以掃描多個測試目錄(tmp_path):
    write_test(tmp_path, """
        import pytest

        @pytest.mark.criteria("#5-1")
        def test_計算總投入():
            assert True
    """)
    other = tmp_path / "skill/tests/test_more.py"
    other.parent.mkdir(parents=True)
    other.write_text(textwrap.dedent("""\
        import pytest

        @pytest.mark.criteria("#5-2")
        @pytest.mark.criteria("#5-3")
        def test_其他():
            assert True
    """))
    r = run("check_criteria.py", "5", "--body-file", issue_file(tmp_path),
            "--tests", "tests", "--tests", "skill/tests", cwd=tmp_path)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "3/3" in r.stdout
