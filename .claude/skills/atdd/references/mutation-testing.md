# 檢查測試的保護力：突變測試

測試的價值不在數量，在「程式改錯時抓不抓得到」。突變測試自動把程式改壞幾百種方式（`+` 改 `-`、`<` 改 `<=`、刪掉一行），每改一次就跑測試：測試失敗＝抓到（killed）；測試照樣通過＝漏網（survived）。

2026-11-04 實測：mutmut 3.8.1（Python）、Stryker 10.1.1＋vitest-runner（TS／JS）。

## 什麼時候跑

- 一個功能（或一組 PR）做完、要關 issue 之前
- 使用者問「測試夠不夠」、要整理測試時
- 不放進 CI：Python 約 1 分鐘、TS 約 2 分鐘，而且結果要人判斷

## 指令

```bash
# Python（設定在 pyproject.toml 的 [tool.mutmut]；mutmut 不加進依賴，用 --with 帶入）
uv run --with mutmut==3.8.1 mutmut run
uv run --with mutmut==3.8.1 mutmut results            # 列出漏網的
uv run --with mutmut==3.8.1 mutmut show <名稱>         # 看改了什麼

# TS／JS（設定在 stryker.config.json、vitest.mutation.config.ts）
npm run test:mutation                                   # 報告在 reports/mutation/index.html
```

## 判斷漏網的突變

漏網不等於要補測試。逐條看，分成三種：

| 種類 | 怎麼處理 | 本 repo 的例子 |
|---|---|---|
| **等價突變**：改了之後結果在數學上一樣，任何測試都抓不到 | 不處理 | `visit(tree, '', …)`（空字串等於不過濾，下一行本來就檢查 tagName）、表格欄位的索引在換行文字前後對稱時剛好對上；年化報酬的二分法多跑一圈、XIRR 的時間起點換一天（所有現金流平移同一個常數，解不變）、沒有匯率時 1 改成 2（買進除 2、市值乘 2 剛好抵銷）、初始值馬上被覆蓋 |
| **外觀細節**：線條粗細、顏色、標題文字 | 不寫測試，用截圖檢查 | 回測器圖表的 58 個漏網 |
| **真正的漏洞**：會讓使用者看到錯的數字或壞掉的頁面 | 補測試，**再跑一次確認抓到了** | 預扣稅只用 2 天測試（索引寫錯、乘除寫反都抓不到）；名詞連結只檢查連結、沒檢查原文有沒有保留；「約 N 個月後回本」分支沒測過 |

判斷時問：「如果程式真的這樣寫錯，使用者會看到什麼？」看得到錯 → 補測試。

## 測不到的地方：讀 dist／用畫面的測試

- Stryker 改了程式不會重新 build，所以讀 `dist/` 的驗收測試、瀏覽器測試不放進 `vitest.mutation.config.ts`（放了只會得到假的漏網）
- mutmut 看不到 Streamlit `AppTest.from_file()` 跑的 `app.py`（顯示「no tests」但其實有畫面測試）
- 這些部分用**手動突變**：挑關鍵邏輯改壞一處 → `npm run build` → 跑驗收測試，確認有測試失敗 → 改回來。例：拿掉 route middleware → `[#22-2]` 失敗；新手路線不合併拆頁 → `[#22-8]` 失敗

## 已知問題

- **Stryker 和 TypeScript 7**：TypeScript 7（Go 重寫版）拿掉了 Stryker 改寫 tsconfig 用的 API（上游 stryker-js#6110、#6111，2026-11 仍未修）。`stryker.config.json` 把 `tsconfigFile` 指向不存在的檔案就會跳過那一步，**不需要安裝 typescript 套件，也不要為了 Stryker 降版**
- **Stryker 的 vitest-runner 和巢狀測試**：舊版在 Vitest 5 的 `describe` 裡的測試會「沒跑任何測試就存活」（上游 #6263，10.1.1 已修）。懷疑結果時手動改壞一處、直接跑 vitest 對照
- **mutmut 只複製 src 和 tests**：測試讀 `scripts/`、`schemas/` 時要在 `also_copy` 列出

## 2026-11-04 的基準

| 範圍 | 補強前 | 補強後 |
|---|---|---|
| Python（937 個突變） | 抓到 677 | 抓到 739（剩下的漏網以等價突變、圖表外觀、需要連網的部分為主） |
| TS／JS（556 個突變） | 73% | 86%（名詞連結外掛 45% → 80%） |
