# 0002 網站框架與網站／系統架構

- 日期：2026-11-03
- 對應 issue：#1

## 背景

要把 `docs/` 發佈成網站，方便日後重新理解；同時要開發投資輔助系統。GitHub Pages 只能放靜態檔案，而系統需要抓資料、計算、讀取個人持股（持股不能公開）。

## 選項

### 架構

- A｜完全分離：網站上 Pages，系統在本機跑 Python ＋ Streamlit
- B｜網站＋定期報告：GitHub Actions 排程跑回測，把公開資料的圖表發佈到網站
- C｜網站上互動計算：瀏覽器端回測器，資料由 Actions 預先產生

### 框架

- Astro Starlight：文件型網站，Markdown 可嵌入互動元件，擴充性高
- MkDocs Material：Python 生態，純文章最省事
- VitePress：輕量，但沒有用 Vue 的需求

## 決定

- 框架：Astro Starlight
- 架構：先做 A，之後視需要升級到 B／C
- 網站與系統放在同一個 repo

## 理由

- 個人持股只能留在本機，系統本來就不適合放公開網站
- A 最簡單，可以先把內容發佈出去
- 選 Starlight 而非 MkDocs，是為了保留未來在網站嵌入圖表、互動回測器（B／C）的空間
