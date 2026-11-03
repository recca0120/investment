#!/usr/bin/env python3
"""檢查 build 出來的網站（dist/）：站內連結都指向存在的頁面，且沒有殘留未轉換的 .md 相對連結。

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

print(f"檢查 {checked} 個站內連結，問題 {len(problems)} 個")
print("\n".join(f"  {p}" for p in problems))
sys.exit(1 if problems else 0)
