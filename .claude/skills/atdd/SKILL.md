---
name: atdd
description: 本 repo 的 ATDD 規則，Python 投資輔助系統（pytest）和 Astro 網站（Vitest ＋ Testing Library ＋ msw-fetch-mock）都適用：新功能的第一個驗收測試一定要先寫、而且要確認紅燈原因正確；issue 的每條驗收條件在合併前都要有測試。附 pytest／Streamlit AppTest／DI（composition root）／網站測試分層的寫法與三個檢查 script，2026-11 實測驗證。只要要寫程式、開發功能、修 bug、寫或改測試、處理 issue、建立新模組（回測器、持股追蹤、比較器、資料來源），或改網站元件、外掛、版面、設定，都一定要先讀。即使使用者只說「幫我做 XX」「把 issue #N 做掉」「改一下網站」而沒提到測試也要使用。網站的建站與設定細節另見 astro-starlight skill。
---

# ATDD（本專案規則）

> 通用原則另有共用 skill `atdd-principles`；這份是本專案的具體做法，兩者衝突時以這份為準。

## 核心想法

不要求每個小步驟都走「紅 → 綠 → 重構」，因為那是過程，沒辦法驗證。要求的是兩件**可以檢查**的事：

1. **第一個驗收測試先寫**。這一步是在站在呼叫者的角度**設計 API**：函式叫什麼、傳什麼、回傳什麼、錯誤怎麼表現。先寫實作的話，API 會被實作的方便程度綁架
2. **驗收測試一定要存在**。issue 上每一條驗收條件，在合併前都要有對應的測試

除此之外的事，實作順序、要不要補單元測試、什麼時候重構、要不要引入 DI container，都依照情況判斷。

## 硬規則

1. **新功能或新模組：先寫第一個驗收測試，再寫實作**
   - 用 `scripts/new_feature.py` 產生骨架（`raise NotImplementedError`）和測試範本
   - 把第一個範本改寫成真正的驗收測試，同時依照測試中的呼叫方式修改骨架的簽名
   - 用 `scripts/check_red.py` 跑**一次**，確認紅燈是因為「功能還沒做」，而不是 import 失敗、簽名不符（TypeError），或測試根本沒驗證到東西
   - 通過後才開始寫實作
2. **issue 每條驗收條件在合併前都有測試**
   - pytest 用 `@pytest.mark.criteria("#<issue>-<序號>")` 標記；Vitest 的測試名稱以 `[#<issue>-<序號>]` 開頭
   - 第二條之後可以先寫實作再補測試
   - PR 前執行 `scripts/check_criteria.py <issue>`，必須全部通過
3. **不准為了讓測試通過而弱化斷言**
   - 刪掉 assert、放寬 `approx` 誤差、`==` 改成 `>=`、把預期值改成程式目前的輸出，全部禁止
   - 測試失敗時，預設是程式錯；如果真的是驗收條件錯了，回到 issue 修正，並跟使用者確認
4. **測試不連網，外部依賴透過 DI 替換**
   - use case 透過參數接收依賴（`Protocol`），只有最外層從 composition root（`container.py`）取得
   - 測試直接把 Fake 傳給 use case；UI 測試用 `override()` 換掉 container
   - 網站：元件的資料和 base 用 props 傳入；HTTP 由 msw-fetch-mock 攔截，沒設定的請求一律失敗
5. **為既有行為補測試時，故意弄壞一次**：測試一寫就綠，沒有紅燈可確認。暫時把程式改壞（重現 bug），確認測試失敗而且訊息指出問題，再改回來

## 測試的保護力比數量重要

驗收條件都有測試，不代表測試抓得到錯。功能做完、要關 issue 前，用**突變測試**檢查：自動把程式改壞幾百種方式，看測試抓不抓得到。漏網的逐條判斷（等價突變不用管、外觀細節用截圖），真正的漏洞補測試後**再跑一次確認抓到**。重複的測試合併、抓不到任何錯的測試刪掉或改寫。做法見 `references/mutation-testing.md`。

```bash
uv run --with mutmut==3.8.1 mutmut run && uv run --with mutmut==3.8.1 mutmut results   # Python
npm run test:mutation                                                                   # TS／JS
```

## 完成前：用真實資料跑一次

假資料只涵蓋你想得到的情況。功能接上真實資料來源後，合併前要**實際跑一次端到端**（例如用 `AppTest` 不 override、直接跑真實 container），看有沒有例外、數字是否合理。

實際案例（#5）：所有測試都通過，但用真實資料一跑就 `ZeroDivisionError`，原因是 006208 早期有 198 天沒有成交，FinMind 收盤價記為 0。發現後先把這個情況寫成測試，再修正。

合理性檢查的例子：追蹤同一個指數的兩檔 ETF（0050、006208），回測結果應該幾乎一樣。

## 彈性區（依照情況判斷）

- 第一個測試通過之後，實作與其他測試的先後順序
- 要不要補單元測試或性質測試：驗收測試涵蓋不到的複雜分支、演算法才補
- 重構時機與幅度：測試保持綠燈就好
- DI：依賴少的時候用手寫的 composition root；組裝變複雜時再換成 DI container 套件（見 `references/dependency-injection.md`）

## 流程

```bash
# 1. 產生骨架與測試範本（有 issue 時，每條驗收條件一個範本）
python3 .claude/skills/atdd/scripts/new_feature.py backtest --entry run_dca --issue 5

# 2. 改寫第一個測試（設計 API），修改骨架簽名，確認紅燈原因正確
python3 .claude/skills/atdd/scripts/check_red.py "tests/acceptance/test_backtest.py::test_每月投入固定金額_期末計算總投入與市值"

# 3. 寫實作，讓測試通過；其餘驗收條件依照情況補測試
uv run pytest

# 4. PR 前確認每條驗收條件都有測試
GH_TOKEN=$(gh auth token -u recca0120) python3 .claude/skills/atdd/scripts/check_criteria.py 5
```

`check_red.py` 要指定**第一個測試的 node id**：其他測試還是範本時，對整個檔案執行會把範本判定為不合格。

## 網站（Astro）

網站功能同樣適用上面的硬規則，工具換成 Vitest。完整寫法、限制與實測結果見 `references/vitest-site.md`。

```bash
npm run test:site                      # build ＋ 全部網站測試（驗收、元件、外掛、瀏覽器）
npx vitest run --project node          # 不需要瀏覽器的部分
python3 .claude/skills/atdd/scripts/check_red.py "tests/site/acceptance/xxx.test.ts::<describe> > [#N-1] <測試名稱>"
GH_TOKEN=$(gh auth token -u recca0120) python3 .claude/skills/atdd/scripts/check_criteria.py N --tests tests --tests .claude/skills/atdd/scripts/tests
```

| 層 | 目錄 | 打在哪裡 |
|---|---|---|
| 驗收（主幹） | `tests/site/acceptance/` | build 好的 `dist/` HTML，Testing Library `getByRole` 查詢。第一個驗收測試寫在這層 |
| 元件 | `tests/site/components/` | Astro Container API，資料與 base 用 props 傳入 |
| 外掛 | `tests/site/plugins/` | rehype 外掛，用 unified 直接跑 |
| 瀏覽器 | `tests/site/browser/` | Vitest Browser Mode ＋ Chrome：版面、互動 |

驗收和瀏覽器測試讀的是 `dist/`：改了程式要先 build，否則測到的是舊網站。

## 測試分層（Python）

| 層 | 目錄 | 打在哪裡 | 什麼時候寫 |
|---|---|---|---|
| 驗收（use case） | `tests/acceptance/` | 公開函式，例如 `run_dca()` | 每條驗收條件；第一條一定先寫 |
| 驗收（UI） | `tests/ui/` | Streamlit `AppTest` | 有畫面時：主要流程＋一個錯誤情境 |
| 單元／性質 | `tests/unit/` | 內部模組、Hypothesis | 驗收測試涵蓋不到時才補 |
| 契約 | `tests/contract/` | 真實資料來源 | 接上真實來源時，確認和 Fake 行為一致（需要連網，預設不跑） |

## 金融計算的測試規則

- 預期值**手算**，在註解寫下計算過程；不要把程式跑一次的結果貼成預期值
- 浮點數用 `pytest.approx`
- 報酬率、跌幅等名詞的**定義**寫在測試註解（例如最大跌幅是用持股市值還是淨值算）
- 跟「今天」有關的邏輯用 `time-machine` 固定時間
- Fake 要遵守和真實來源相同的前置條件（查不到要報錯，不能回傳空值）

## 讀哪份參考

| 什麼時候 | 讀什麼 |
|---|---|
| 寫第一個驗收測試（設計 API） | `references/first-acceptance-test.md` |
| 要接外部依賴、要注入 Fake、考慮引入 DI container | `references/dependency-injection.md` |
| 選擇 Fake／Stub／Mock、寫契約測試 | `references/test-doubles.md` |
| 做有畫面的功能 | `references/streamlit-apptest.md` |
| 第一次建立 Python 專案或調整 pytest 設定 | `references/pytest-setup.md` |
| 寫網站測試（驗收、元件、外掛、瀏覽器、HTTP） | `references/vitest-site.md` |
| 檢查測試的保護力、判斷漏網的突變、手動突變 | `references/mutation-testing.md` |
| 想看完整可執行的例子 | `assets/example/`（回測器：驗收、UI、性質測試、container，共 7 個測試） |

## Scripts

只依賴 Python 標準函式庫（`check_criteria.py` 另外需要 `gh`），在專案根目錄執行。`check_red.py`、`check_criteria.py` 同時支援 pytest 與 Vitest（檔名 `*.test.ts` 就用 Vitest）。

| Script | 對應規則 | 結束碼 |
|---|---|---|
| `new_feature.py <模組> --entry <函式> [--issue N]` | 1：讓測試先行變成最省事的起手式 | 0 建立成功；1 檔案已存在（不覆蓋） |
| `check_red.py <node id 或 檔案::完整測試名稱> [--runner]` | 1：紅燈原因正確 | 0 正確的紅燈；1 不是 |
| `check_criteria.py <issue> [--tests 目錄]… [--repo] [--body-file]` | 2：每條驗收條件都有測試 | 0 全部都有；1 有缺漏 |

驗收條件的編號依照 issue「驗收條件」段落中 checkbox 的順序：`#5-1`、`#5-2`…。新增條件請加在最後，不要調整順序。

Script 本身的測試在 `scripts/tests/`（26 個，Vitest 部分用假的 runner 回放實際的 junit 報告），CI 也會跑。修改 script 後執行：
`uv run pytest .claude/skills/atdd/scripts/tests -p no:cacheprovider --rootdir .claude/skills/atdd/scripts -o addopts=""`

## 資料來源

- [Acceptance test-driven development（Wikipedia）](https://en.wikipedia.org/wiki/Acceptance_test-driven_development)
- [How to start with ATDD（PMI Disciplined Agile）](https://www.pmi.org/disciplined-agile/how-to-start-with-acceptance-test-driven-development)
- [BDD from scratch（Hackernoon）](https://sia.hackernoon.com/behavior-driven-development-from-scratch-99r32fj)
- [Understanding pytest-bdd（BrowserStack）](https://www.browserstack.com/guide/pytest-bdd)：評估後決定不使用 Gherkin，理由見 `references/pytest-setup.md`
- 實測：pytest 9.2.0、streamlit 1.66.1、hypothesis 6.170、pytest-socket 0.8.1；vitest 5.1.0、@testing-library/dom 10.4.2、msw 3.0.3、msw-fetch-mock 0.7.1（2026-11-03）
