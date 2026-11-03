---
name: atdd
description: 本 repo（Python 投資輔助系統）的 ATDD（驗收測試驅動開發）流程與 pytest／Streamlit 測試寫法，2026-11 實測驗證。只要要寫程式、開發功能、修 bug、寫或改測試、設計測試結構、處理 issue 的驗收條件、或建立新模組（回測器、持股追蹤、比較器、資料來源），都一定要先讀這個 skill，從一個會失敗的驗收測試開始，而不是先寫實作或先寫單元測試。即使使用者只說「幫我做 XX 功能」「把 issue #N 做掉」而沒提到測試，也要使用。不適用於 Astro 網站（用 astro-starlight skill）。
---

# ATDD：驗收測試驅動開發（Python ＋ pytest）

> 通用原則另有共用 skill `atdd-principles`；這份是本專案的具體做法，兩者衝突時以這份為準。

## 為什麼用 ATDD

投資系統最怕的是「數字算錯但看起來很合理」。ATDD 先把**使用者看得到的結果**用具體數字釘死（例如「每月 1,000 元、三個月後市值 4,000」），再寫程式讓它成立：

- 驗收測試描述行為，不綁定內部結構，之後怎麼重構都不用改測試
- 預期值是手算的，等於多了一份獨立驗算
- 驗收條件直接來自 issue，測試就是規格，日後回來看得懂這個功能該做什麼

單元測試不是起點：只有當某段邏輯複雜到驗收測試難以涵蓋所有分支時才補。

## 流程（double loop）

```
issue 的驗收條件（Given / When / Then）
  └─ 外圈：寫一個驗收測試 → 確認紅燈「原因正確」
       └─ 內圈（需要時）：單元測試 → 紅 → 綠 → 重構
     → 驗收測試變綠 → 重構 → 下一個驗收條件
```

### 1. 從 issue 取得驗收條件

- 功能型 issue 的範本有「使用情境（驗收條件）」欄位，用 Given / When / Then 寫
- 條件要有**具體數字**，不要寫「正確計算報酬率」，要寫「價格 100 → 50 → 100、每月 1,000 → 總投入 3,000、市值 4,000」
- 條件太大、一個測試寫不完時，拆成多個小情境，不要退回去先寫一堆單元測試

### 2. 寫驗收測試，確認紅燈的原因正確

- 測試打在**對外的入口**：公開的 use case 函式（例如 `run_dca()`），或 Streamlit 畫面（`AppTest`），不要直接呼叫內部的私有函式
- 測試名稱用中文描述「情境＋預期結果」：`test_每月投入固定金額_期末計算總投入與市值`
- 預期值旁邊寫註解說明怎麼手算出來的
- **紅燈必須是因為「功能還沒做」**，不能是因為 `ModuleNotFoundError` 或語法錯誤。做法是先建立只有型別與簽名、內容 `raise NotImplementedError` 的骨架，讓測試能 import、能執行，然後失敗在 `NotImplementedError` 或斷言上。collection error 代表測試根本沒跑，這種紅燈什麼都沒證明

### 3. 寫最小實作讓它變綠

- 只寫讓目前的測試通過所需的程式碼
- 某段邏輯分支很多、或演算法本身值得獨立驗證時，才進內圈補單元測試或性質測試（Hypothesis）

### 4. 重構

- 所有測試保持綠燈
- 測試和產品程式碼不要在同一步一起改
- **不准為了讓測試通過而弱化斷言**（拿掉 assert、放寬 `approx` 誤差、改成 `>=`）。測試失敗時，預設是程式錯，不是測試錯；如果真的是驗收條件本身錯了，要回到 issue 修正條件，並跟使用者確認
- 內部重構讓驗收測試變紅，代表那個測試其實在測實作細節，要改寫測試

## 測試分層（本專案）

| 層 | 目錄 | 打在哪裡 | 什麼時候寫 |
|---|---|---|---|
| 驗收（use case） | `tests/acceptance/` | 公開函式，例如 `run_dca()` | 每個驗收條件都要有，先寫 |
| 驗收（UI） | `tests/ui/` | Streamlit `AppTest` 操作畫面 | 功能有畫面時，至少一個主要流程＋一個錯誤情境 |
| 單元／性質 | `tests/unit/` | 內部模組、Hypothesis 性質 | 只在驗收測試涵蓋不到時補 |
| 契約 | `tests/contract/` | 真實資料來源 | 驗證假物件和真實來源行為一致，預設不跑（需要連網） |

## 金融計算的測試規則

- **用假的資料來源，不要連網**：真實 API 慢、會變、會限流，結果不可重複。資料來源一律透過 `Protocol` 注入，測試用 `tests/fakes/` 的 Fake。pytest 設定 `--disable-socket`，不小心連網時測試會直接失敗
- **假物件要和真實來源有相同的前置條件**：例如查不到代號時，真實來源會報錯，Fake 也必須報錯，不能默默回傳空串列，否則會遮蔽真正的 bug
- **浮點數用 `pytest.approx`**，不要用 `==` 比較金額或比率
- **預期值要手算**，或從可信來源（券商、官方數據）取得；不要用程式跑一次再把結果貼成預期值（那只是在測「程式跟自己一樣」）
- **跟日期有關的邏輯**（「今天」、「本月」）用 `time-machine` 固定時間
- **報酬率、跌幅的定義要寫在測試註解裡**（例如最大跌幅是用持股市值算，還是用淨值算），因為同一個名詞可能有不同算法

## 讀哪份參考

- `references/pytest-setup.md`：`pyproject.toml` 設定、目錄結構、常用指令；第一次在 repo 建立 Python 專案或調整測試設定時讀
- `references/streamlit-apptest.md`：用 `AppTest` 寫 UI 驗收測試、怎麼注入假資料來源；做有畫面的功能時讀
- `references/test-doubles.md`：Fake／Stub／Mock 怎麼選、契約測試；要接外部資料來源時讀
- `assets/example/`：一個完整跑過的範例（定期定額回測器：驗收、UI、性質測試，共 7 個測試），可以直接參考結構

## Checklist

```
開始一個功能前：
- [ ] issue 上有 Given / When / Then 驗收條件，而且有具體數字

每個循環：
- [ ] 先寫驗收測試，打在公開入口或畫面
- [ ] 紅燈的原因是「功能還沒做」（NotImplementedError 或斷言失敗），不是 import 失敗
- [ ] 只寫讓測試通過的最小程式碼
- [ ] 重構時所有測試保持綠燈、沒有弱化斷言

完成功能時：
- [ ] `uv run pytest` 全部通過
- [ ] 預期值都有手算註解
- [ ] 沒有連網的測試（除了 tests/contract/）
- [ ] PR 內文寫 Closes #N
```

## 資料來源

- [Acceptance test-driven development（Wikipedia）](https://en.wikipedia.org/wiki/Acceptance_test-driven_development)
- [How to start with ATDD（PMI Disciplined Agile）](https://www.pmi.org/disciplined-agile/how-to-start-with-acceptance-test-driven-development)
- [BDD from scratch（Hackernoon，double loop）](https://sia.hackernoon.com/behavior-driven-development-from-scratch-99r32fj)
- [Seb Rose: Intro to TDD and BDD（ACCU 2017）](https://accu.org/conf-docs/PDFs_2017/Seb_Rose_-_Intro_to_TDD_and_BDD.pdf)
- [Understanding pytest-bdd（BrowserStack）](https://www.browserstack.com/guide/pytest-bdd)：評估後決定不用 Gherkin，理由見 `references/pytest-setup.md`
- 實測：pytest 9.2.0、streamlit 1.66.1、hypothesis 6.170、pytest-socket 0.8.1（2026-11-03）
