---
title: 2026-11-04 網站版面、設計 token、名詞解釋
---

## 使用者的問題

1. 網站版面要重新設計、該用分頁就用分頁、可以用相容 Tailwind 的元件庫；不確定的先討論
2. 「應該上網研究人類怎麼閱讀比較舒服，而不是問我，因為我不懂設計」，可以先給幾個 HTML 樣稿
3. A／B／C 樣稿不知道哪個好，請 Claude 先決定
4. 為什麼不用 daisyUI？（樣稿 B、C 大多是自己寫的 CSS）
5. 應該先定義一個 theme 檔案、用編譯的方式產生 CSS，走程式化 design
6. 每篇文章的資料來源要不要另開頁面？
7. 以新手來說，是不是要先做名詞解釋（ETF、VT、債券…），分門別類說明？
8. 如果問題和一開始定的目標違背，要提出來討論（要記下來）

## 結論

- 閱讀研究：中文一行 17～40 字（W3C clreq）、多數人先掃標題（NN/g）、分頁只用在同一件事的不同面向
- 版面採樣稿 B（新手路線）＋ C（圖解），留在 Starlight，加 daisyUI 5 與 starlight-sidebar-topics：見 [0006 網站版面](../decisions/0006-site-layout-route.md)
- 顏色、字體、圓角只寫在 `site/design/tokens.ts`，build 時編譯成 Starlight、Tailwind、daisyUI 三組變數；測試直接用 token 算對比
- 資料來源不另開頁面（查證時要在同一頁），改成網站上預設收合（#22 之後的 PR）
- 名詞解釋和專案目標一致（文章 05 原本就規劃「名詞表」），但會打斷 #22，決定先做名詞：分 6 類、每個名詞固定四項（一句話、用途、例子、新手注意），知識文章裡第一次出現的名詞自動連過去
- 設計細節由 Claude 研究後決定、用樣稿給使用者看；需求和目標衝突時先提出討論

## 產生的 issue

- [#22 網站版面重新設計](https://github.com/recca0120/investment/issues/22)：第 1 個 PR（#23）已合併：設計 token、三個分區、新手路線側欄、寬表格；之後：重點摘要、分頁、拆頁、流程圖、首頁、資料來源收合
- [#24 新手名詞解釋](https://github.com/recca0120/investment/issues/24)

## 過程中發現的問題

- starlight-sidebar-topics 0.9 在網站有 base 時，判斷不出每區的最後一篇，「下一篇」會跨區；用 route middleware 補
- daisyUI 的 reset 在最低的 CSS 圖層，其實蓋不過 Starlight 內文樣式（原本以為會，實測後修正說明）
- 驗收條件的編號要寫在 test 名稱上，寫在 describe 上 check_criteria 認不出來

## 下午：回到使用者本人的進度

- 使用者：「我就是不懂，所以才需要你幫我規畫」。Claude 承認之前一直把該做什麼丟回去問，也指出偏離目標：時間多花在網站外觀，使用者還沒選定方案、也沒有開戶步驟
- 規劃四個階段：① 自我檢查、選方案 → ② 開戶到第一次扣款 → ③ 持股追蹤（#6）→ ④ 邊投邊學（網站剩下的改版放這裡）
- 第 1 階段：改問生活化的問題（錢多久不用、預備金、大跌時的反應、每月金額、負債、時間、外幣），回答存在 `private/`
- 結論：錢分成彈性金與長期金；先走方案 D 練習 3 個月，再決定是否轉 C。見[決策 0007](../decisions/0007-starter-plan.md)
- 第 2 階段：整理成[開始行動：開戶到第一次扣款](../knowledge/09-getting-started-actions.md)，放在新手路線第 5 站
- Claude 不是持牌顧問：只提供判斷框架與後果，方案由使用者選

## 傍晚：盤點 GitHub、完成網站改版

- 盤點發現沒追蹤到的事：README 連到已改名的文章 07（GitHub 上 404）、決策索引只到 0004、文章 05 過時、Roadmap 的系統功能沒開 issue → [#29](https://github.com/recca0120/investment/issues/29) 修正，並加測試檢查 GitHub 上的相對連結；系統功能開成 #30（ETF 比較器）、#31（再平衡提醒）、#32（成本與稅試算），放 Backlog
- #22 完成：文章 08 拆成[① 選管道](../knowledge/08-us-stock-channels-tax.mdx)與[② 稅務](../knowledge/08-us-stock-tax.md)、加流程圖；首頁加回測關鍵數字、新手路線、網站分區、最近更新
- 發現並修正：首頁閱讀順序照檔名排，加入「開始行動」後和側欄不一致 → 首頁與側欄共用同一份分組邏輯
- 待使用者同意：回報 starlight-sidebar-topics 在有 base 時「下一篇」跨區的 bug
