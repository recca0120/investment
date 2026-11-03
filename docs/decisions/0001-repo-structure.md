# 0001 Repo 結構與內容放置規則

- 日期：2026-11-03

## 背景

需要一個地方記錄投資學習的討論、整理知識、開發系統，未來還要發佈成網站。GitHub 提供 repo 檔案、Wiki、Issues、Discussions、Projects 多種位置，需要決定什麼放哪裡。

## 選項

1. 知識放 Wiki，程式放 repo
2. 知識放 repo 的 `docs/`，Wiki 不用
3. 兩邊都放

## 決定

選項 2：

- 知識：`docs/knowledge/`
- 討論紀錄：`docs/log/`
- 決策：`docs/decisions/`
- 待辦：Issues ＋ Project board
- 真實持股：`private/`（gitignore）
- Repo 設為 public（GitHub Pages 免費）

## 理由

- 網站要從檔案產生，`docs/` 可以直接當網站來源，Wiki 不行
- 只放一處，避免內容不同步
- `docs/` 有 git 歷史、可以走 PR 審閱，Wiki 不方便
