#!/usr/bin/env python3
"""檢查 build 出來的網站（dist/）：
- 站內連結都指向存在的頁面
- 沒有殘留未轉換的 .md 相對連結
- 每一篇文章都出現在側欄（Starlight 的 autogenerate 設錯目錄時，側欄會是空的，但 build 不會報錯）

用法：npm run build && python3 scripts/check-site-links.py [--base /investment]
"""
import argparse
import re
import sys
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("--dist", default="dist")
ap.add_argument("--base", default="/investment")
args = ap.parse_args()

dist = Path(args.dist)
prefix = args.base.rstrip("/") + "/"
problems, checked = [], 0
for page in sorted(dist.rglob("*.html")):
    html = page.read_text()
    for href in re.findall(r'href="([^"]+)"', html):
        if href.startswith(prefix):
            checked += 1
            target = dist / href[len(prefix):].split("#")[0].split("?")[0]
            if not (target.is_file() or (target / "index.html").is_file()):
                problems.append(f"{page}: 指向不存在的頁面 {href}")
        elif not re.match(r"^[a-z]+:|^#|^/", href) and re.search(r"\.mdx?(#|$)", href):
            problems.append(f"{page}: 未轉換的 .md 相對連結 {href}")

# 側欄：取一個有側欄的頁面，比對所有文章頁是否都在側欄裡
pages = {
    prefix + str(p.parent.relative_to(dist)) + "/"
    for p in dist.rglob("index.html")
    if p.parent != dist  # 首頁是 splash，不在側欄
}
sidebar_page = next((p for p in sorted(dist.rglob("index.html")) if 'class="top-level' in p.read_text()), None)
if sidebar_page is None:
    problems.append("找不到有側欄的頁面")
else:
    html = sidebar_page.read_text()
    sidebar = html[html.find('class="top-level'):html.find("</sl-sidebar-state-persist>")]
    missing = sorted(pages - set(re.findall(r'href="([^"]+)"', sidebar)))
    problems += [f"側欄缺少文章：{m}" for m in missing]

print(f"檢查 {checked} 個站內連結、{len(pages)} 篇文章的側欄，問題 {len(problems)} 個")
print("\n".join(f"  {p}" for p in problems))
sys.exit(1 if problems else 0)
