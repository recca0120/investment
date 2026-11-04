"""網站截圖：電腦日間、電腦夜間、手機（iPhone 13）各一張，交出設計前自己先看過。

用法（先啟動網站：npx astro preview --port 4322 或 npm run dev）：
  uv run --with playwright python .claude/skills/site-design/scripts/shoot.py knowledge/01-getting-started/ --out /tmp/shots
  uv run --with playwright python .claude/skills/site-design/scripts/shoot.py knowledge/07-dca-backtest-2016-2026/ \
      --click 'a.glossary-link' --nth 2 --out /tmp/shots    # 先點第 3 個名詞再截（看彈出的東西）

用本機的 Chrome（channel="chrome"），不另外下載瀏覽器。手機用裝置模擬，不用 --window-size（headless 有最小寬度）。
"""
import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="網站路徑，例如 knowledge/01-getting-started/")
    ap.add_argument("--base", default="http://localhost:4322/investment/")
    ap.add_argument("--out", default="shots")
    ap.add_argument("--click", help="截圖前先點擊的 CSS selector")
    ap.add_argument("--nth", type=int, default=0, help="--click 有多個符合時點第幾個（從 0 起）")
    ap.add_argument("--full", action="store_true", help="截整頁（預設只截第一個畫面）")
    a = ap.parse_args()

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    url = a.base.rstrip("/") + "/" + a.path.lstrip("/")

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        shots = [
            ("desktop-light", {"viewport": {"width": 1400, "height": 900}, "color_scheme": "light"}),
            ("desktop-dark", {"viewport": {"width": 1400, "height": 900}, "color_scheme": "dark"}),
            ("mobile", {**p.devices["iPhone 13"], "color_scheme": "light"}),
        ]
        for name, options in shots:
            page = browser.new_context(**options).new_page()
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(400)
            if a.click:
                target = page.locator(a.click).nth(a.nth)
                target.scroll_into_view_if_needed()
                page.mouse.wheel(0, -200)
                target.click()
                page.wait_for_timeout(400)
            overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
            file = out / f"{name}.png"
            page.screenshot(path=str(file), full_page=a.full)
            notes = [n for n in ["水平捲動！" if overflow else "", f"JS 錯誤：{errors}" if errors else ""] if n]
            print(f"{file}  {'｜'.join(notes) or 'OK'}")
        browser.close()


if __name__ == "__main__":
    main()
