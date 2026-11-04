---
title: 0006 網站版面：新手路線＋圖解
description: 網站分成知識／決策／紀錄三區，知識文章排成一站一站的路線，文章開頭用重點和圖解，元件用 daisyUI
---

> 2026-11-04 決定（issue #22）。配色與字體沿用 [0005 小豬撲滿](0005-site-style-piggy-bank.md)，這份只管版面與閱讀動線。

## 背景

改版前的問題（2026-11-04 截圖檢查）：

- 知識、決策、討論紀錄混在同一個側欄；讀完最後一篇知識按「下一則」，會跳到決策 0001
- 內文欄窄，文章 08「四種管道比較」表格被擠成一個字一行
- 平行的內容（文章 07 的三張結果表、文章 08 的四個稅務主題）一路往下堆
- 首頁後半段只是清單

## 閱讀研究

| 研究 | 結論 | 用在哪裡 |
|---|---|---|
| W3C 中文排版需求（clreq） | 書籍內文一行 17～40 字，橫排不宜超過 48 字 | 內文寬度固定約 38 字；只有表格和圖解可以更寬 |
| NN/g：F 型與 layer-cake 掃讀 | 79% 的人先掃過頁面，只有 16% 逐字讀；多數人只看標題 | 每篇開頭先放「重點」；標題寫結論，不寫「說明」「介紹」 |
| Carbon、EU 元件庫：分頁用法 | 分頁用在「同一件事的不同面向」；重要內容不要藏在分頁裡；分頁不當主要導覽 | 07 的三張表、08 的稅務主題用分頁；結論不藏 |

## 選項

做了三份 HTML 樣稿（同一份內容）：

| 樣稿 | 做法 | 評估 |
|---|---|---|
| A 整理好的筆記 | 保留現在結構，修寬表格、加重點框、稅務改分頁 | 改動最小，但閱讀感覺和現在差不多 |
| B 一站一站的路線 | 知識文章排成新手路線，側欄顯示第幾站；長文章拆頁；結論畫成流程圖 | 新手最清楚「下一步讀什麼」 |
| C 圖解優先 | 首頁像儀表板；文章先用大數字和卡片講重點，細節收起來 | 掃一眼就抓到重點，但缺少閱讀順序 |

## 決定

**B 的結構＋C 的圖解**，留在 Starlight，加兩個套件：

- `starlight-sidebar-topics`：頂部三個分區（投資知識／決策紀錄／討論紀錄），各有自己的側欄，「上一篇／下一篇」不跨區
- daisyUI 5：Tailwind 的元件庫（卡片、統計數字、分頁、步驟、表格）。只載入元件，不載入它的 reset 和內建主題；主題由設計 token 產生，所以外觀是小豬撲滿配色，不是 daisyUI 預設樣子
- 設計 token：顏色、字體、圓角只寫在 `site/design/tokens.ts`，build 時編譯成 Starlight、Tailwind、daisyUI 三組 CSS 變數。改一個顏色三邊同時變，測試會用 token 直接算每組文字／底色的對比

版面規則：

- **路線順序**：入門路線 → 推薦方法 → 商品比較 → 入門方案 → 開始行動 → 定期定額回測 → 美股 → 資料來源 → 系統規劃。選好方案就接著動手（2026-11-04 加入「開始行動」）；新手先想知道「結果如何」，所以回測排在資料來源之前；資料來源和系統規劃是進階內容，放最後
- **文章開頭**：站號、標題、「重點」（最多 3 點）；有關鍵數字的文章再加大數字卡片
- **寬表格**：可以超出文字欄；放不下時表格自己左右滑，第一欄固定
- **長文章拆頁**：一頁講一件事。文章 08 拆成「① 選管道」「② 稅務」
- **daisyUI 有的元件就用 daisyUI**；只有它沒有的（撲滿、硬幣、流程圖排列）才自己寫
  - 例外：Starlight 內建、已經處理好無障礙的元件優先，例如文章裡的分頁用 Starlight 的 `<Tabs>`（鍵盤左右鍵切換、ARIA 分頁角色），不用 daisyUI 的 radio tabs
- **資料來源**：不另開頁面（查證時要在同一頁），網站上預設收合並標示筆數；Markdown 原稿不用改

## 理由

- 使用者是新手，文章本來就有先後順序，路線最能回答「我讀到哪、下一篇是什麼」
- 開頭重點＋大數字符合多數人「先掃再決定要不要讀」的習慣
- 留在 Starlight 保住搜尋、目錄、夜間模式和既有測試；daisyUI 補上 Starlight 沒有的元件，不用自己從頭寫

## 資料來源

- [W3C：Requirements for Chinese Text Layout](https://www.w3.org/tr/clreq/)
- [NN/g：F-Shaped Pattern of Reading on the Web](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)
- [NN/g：The Layer-Cake Pattern of Scanning Content on the Web](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)
- [Carbon Design System：Tabs usage](https://carbondesignsystem-gzes3rub7-carbon-design-system.vercel.app/components/tabs/usage)
- [EU Component Library：Tabs usage](https://ec.europa.eu/component-library/eu/components/navigation/tabs/usage)
- [starlight-sidebar-topics](https://starlight-sidebar-topics.netlify.app/docs/getting-started/)
- [daisyUI](https://daisyui.com/)
