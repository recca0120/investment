---
title: 0004 網站視覺設計：存摺帳本
---

- 日期：2026-11-03
- 狀態：配色與首頁主視覺已被 [0005 小豬撲滿](./0005-site-style-piggy-bank.md) 取代；下方「Tailwind」一節的分工仍然有效

## 背景

網站原本是 Starlight 的預設外觀，沒有經過設計；而且上線後側欄是空的。修正 bug 時，使用者提出應該用設計 skill（frontend-design）重新設計。

## 選項

- A 存摺帳本：灰綠紙色、印章紅、首頁主視覺是一頁「0050 定期定額存摺」
- B 台股看盤：紅漲綠跌、首頁主視覺是十年市值曲線
- C 方格筆記本：方格紙、螢光筆、首頁是學習進度時間軸

範圍：保留 Starlight 結構（側欄、搜尋、目錄），只改配色、字體、表格樣式，並重做首頁。

## 決定

採用 A。使用者選了範圍但沒有選方向，依 skill「做有觀點的選擇」由 Claude 決定，之後可換 B 或 C。

設計規則：

| 項目 | 值 |
|---|---|
| 紙（日間） | `#E9EFEC`，夜間 `#172124` |
| 墨 | `#1F2A2E`，夜間 `#E6EEEB` |
| 印章紅（全站唯一強調色） | `#B3261E`，夜間 `#E0605A` |
| 格線 | `#C5D3CD`，夜間 `#2F4045` |
| 連結（藍墨水） | `#2F5D7C`，夜間 `#8DB6D3` |
| 字體 | 思源黑體 Noto Sans TC（400／700／900），數字用等寬數字 |

- 印章是唯一的大膽元素，也是唯一有動畫的元素（載入時蓋章一次，開啟「減少動態效果」時關閉）
- 表格中整欄都是數字時自動靠右（`site/plugins/rehype-num-cells.mjs`）
- 避免的通用套路：米色底、全大寫小標、中點分隔、按鈕加箭頭、每個區塊都做成卡片

## 理由

- 定期定額就是每月固定存入，存摺是最貼近主題的意象
- 首頁主視覺直接用自己回測出來的真實數字（`scripts/export_passbook.py` 產生）
- 刻意避開「米色＋襯線＋陶土色」這組常見的 AI 設計套路：紙色改用存摺的灰綠，標題用黑體

## Tailwind：一開始不用，2026-11-03 改用

**原本不用的理由**：這次主要是改 Starlight 的 CSS 變數，自訂元件只有兩個，Astro 的 scoped style 就夠了；Starlight 使用 cascade layers，要搭配 `@astrojs/starlight-tailwind` 才能共存。

**改用的理由**：使用者想把風格改得輕鬆一點，之後也會有更多自訂元件。改風格前先換成 Tailwind（[#17](https://github.com/recca0120/investment/issues/17)），之後調整用 token ＋ utility class，不用在每個元件寫 CSS。這一步只換工具、外觀不變（導入前後截圖比對，文章頁完全相同，首頁只有不到 1px 的列高差異）。

現在的分工：

| 檔案 | 放什麼 |
|---|---|
| `site/design/tokens.ts` | 顏色（日間／夜間各一組）、字體、圓角的原始值。2026-11-04 起（#22）唯一來源，build 時編譯成 `site/styles/generated/tokens.css`（Starlight `--sl-color-*`、Tailwind `@theme`、daisyUI 主題） |
| `site/styles/starlight.css` | 文章表格、引言、側欄等 Starlight 頁面的調整（#22 之前叫 `theme.css`，也放配色） |
| `site/styles/global.css` | Tailwind ＋ daisyUI 入口；token 以外的設定：字級、版寬、斷點、動畫 |
| 元件、`docs/*.mdx` | 只用 utility class 和 token，**不能寫死顏色**（`tests/site/acceptance/no-hardcoded-colors.test.ts` 會檢查） |
