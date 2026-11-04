# 設計依據：閱讀研究與互動模式

做設計決定前先查這裡；查到新的研究或瀏覽器支援度就補進來，附來源與日期。

## 目錄

- 中文排版：行長、行高
- 掃讀習慣：先看重點
- 分頁什麼時候用
- 補充說明：留在原頁（名詞小卡）
- 資料來源：同一頁收合
- 瀏覽器功能支援度

## 中文排版：行長、行高

- W3C 中文排版需求（clreq）：書籍內文一行 17～40 字，橫排不宜超過 48 字 → 本站內文約 38 字
- 行太長，眼睛換行時容易找錯行；行太短，句子被切碎

## 掃讀習慣：先看重點

- NN/g 眼動研究：79% 的人先掃過頁面，只有 16% 逐字讀；常見 F 型、layer-cake（只看標題）
- → 每篇開頭放「重點」1～3 點；標題寫結論；有關鍵數字就放大數字

## 分頁什麼時候用

- Carbon、EU 元件庫：分頁用在同一件事的不同面向（例如三檔 ETF 的結果表、四個稅務主題）
- 重要內容不要藏在分頁；分頁不能當主要導覽
- 文章裡用 Starlight `<Tabs>`（鍵盤左右鍵、ARIA 已處理好）

## 補充說明：留在原頁（名詞小卡）

- Wikipedia 頁面預覽（Page Previews）A/B 測試：讀者滑過連結就能看摘要，比較少跳離頁面、更專注在原文
- 設計系統共通原則：「看一下就關」的內容用浮動小卡（popover／toggletip）；要操作、內容多的才用側邊或底部面板
- 側邊滑出面板（drawer）不適合名詞解釋：視線要移到畫面邊緣、手機上幾乎全螢幕
- 手機上沒有滑鼠停留，改成點擊後從底部升起（bottom sheet）
- 本站實作：#50（`site/plugins/rehype-glossary-links.mjs`、`site/components/GlossaryCards.astro`）

## 資料來源：同一頁收合

- 查證時要對照內文，跳到別頁會失去脈絡 → 留在文末，預設收合並標示筆數（`rehype-collapse-sources`）

## 瀏覽器功能支援度（2026-11 查）

| 功能 | 狀態 | 本站用法 |
|---|---|---|
| Popover API（`popover` 屬性） | Baseline 2025-01 起所有主流瀏覽器 | 名詞小卡；Esc、點外面自動關閉 |
| CSS anchor positioning | Baseline 2026-01（Chrome 125、Safari 26、Firefox 147） | 小卡貼在名詞旁，空間不夠自動翻面；不支援時用 `@supports` 改成底部卡片 |
| `color-mix()` | 所有主流瀏覽器 | 用 token 調透明度（陰影、遮罩），不寫死 rgba |

新功能要先查支援度；只有新瀏覽器有的功能，要有退回方案（沒有就照常是連結、改用底部卡片等）。

## 資料來源

- [W3C：Requirements for Chinese Text Layout](https://www.w3.org/tr/clreq/)
- [NN/g：F-Shaped Pattern of Reading on the Web](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)
- [NN/g：The Layer-Cake Pattern of Scanning Content on the Web](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)
- [Carbon Design System：Tabs usage](https://carbondesignsystem.com/components/tabs/usage/)
- [EU Component Library：Tabs usage](https://ec.europa.eu/component-library/eu/components/navigation/tabs/usage)
- [Wikimedia：Page Previews](https://www.mediawiki.org/wiki/Page_Previews)
- [web.dev：Popover API 進入 Baseline](https://web.dev/blog/popover-baseline)
- [web.dev：New to the web platform in January（2026，anchor positioning）](https://web.dev/blog/web-platform-01-2026)
- [MDN：Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
