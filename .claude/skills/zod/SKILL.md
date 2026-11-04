---
name: zod
description: zod 4 ＋ 本 repo 的跨語言共用資料格式（zod → JSON Schema → Pydantic，決策 0009；2026-11 實測驗證）。只要碰到網站（TypeScript）和 Python 之間交換的資料——價格、匯率、代號清單、標準答案、之後的持股或比較器資料——就一定要先讀：新增或修改 site/lib/schemas.ts、新增一種 JSON 資料檔、改 Python 匯出腳本的輸出欄位、改 src/invest/schemas/、執行 npm run schemas、網頁讀 JSON 要驗證、Python 寫 JSON、看到 ValidationError 或「格式不對」錯誤、懷疑網頁和 Python 判斷不同時。即使使用者只說「加一個欄位」「多存一種資料」「網站要讀新的資料」而沒提到 zod，也要使用。
---

# zod 4 與跨語言共用資料格式

本 repo 網站和 Python 交換的資料格式只定義一次：

```
site/lib/schemas.ts（zod，唯一來源）
   │  npm run schemas → scripts/generate-schemas.ts（z.toJSONSchema）
   ▼
schemas/*.schema.json（進 git）
   │  scripts/generate_models.py（datamodel-code-generator）
   ▼
src/invest/schemas/*.py（Pydantic v2，自動產生，不要手改）
```

Python 寫出 JSON 前用 Pydantic 驗證（`invest.export.validated()`、`write_json()`），網頁讀取時用 zod 驗證（`parse*()`）。為什麼這樣選、比較過哪些工具，見 `docs/decisions/0009-shared-schema.md`。

## 已驗證的版本（2026-11-04）

| 套件 | 版本 |
|---|---|
| zod | 4.6.7 |
| pydantic | 2.14.2 |
| datamodel-code-generator | 0.88.0 |

zod 3 → 4 改了很多（`z.iso.date()`、`z.strictObject()`、`.meta()`、`z.toJSONSchema()`、錯誤用 `error` 參數），訓練資料裡的 zod 3 寫法不要直接照抄。升級 zod 後先跑 `node .claude/skills/zod/scripts/verify-zod.ts`，它會逐條檢查這份 skill 寫的行為還成不成立。

## 核心規則（每一條都是實測踩過的）

1. **物件一律用 `z.strictObject()`**。`z.object()` 會默默丟掉多餘欄位、照樣通過，但它轉出的 JSON Schema 是 `additionalProperties: false`，產生的 Pydantic 模型會拒絕——同一份資料網頁說 OK、Python 說不行（#46）
2. **只用 JSON Schema 表達得出來的規則**：型別、列舉、`z.iso.date()`、`.min()`、`.nullable()`、`.optional()`。`.refine()`／`.superRefine()` 轉 JSON Schema 時**被默默忽略**，Python 那邊不會檢查；`z.date()`、`.transform()`、`z.codec()` 轉不過去（會丟錯）。跨語言的規則需要更複雜的檢查時，兩邊各自寫並加測試
3. **日期用字串 `z.iso.date()`**（YYYY-MM-DD，會擋 2025-02-30），不要用 `z.date()`。Pydantic 端會變成 `datetime.date`
4. **選填用 `.optional()`、可為空用 `.nullable()`，兩者意思不同**：`.optional()` 是「可以不給這個欄位」，給 `null` 會被拒絕；`.nullable()` 是「一定要給，但可以是 null」。Python 端：寫出時用 `exclude_unset`（`validated()` 已經處理），用 `exclude_none` 會把 `nullable` 欄位的 null 也拿掉，網頁就驗證失敗（實際踩過）
5. **巢狀物件加 `.meta({ title: '…' })`**，產生的 Pydantic 類別名稱才好懂（`GoldenInput` 而不是 `Input`）；最外層再加 `id`
6. **Python 寫 JSON 一律用 `invest.export.write_json()`**：`json.dumps` 預設會寫出 `NaN`，那不是合法 JSON，網頁讀到直接失敗
7. **網頁讀 JSON 一律經過 `parse*()`**，不要 `as PriceSeries` 直接轉型；型別用 `z.infer` 推導，不要另外手寫 interface

## 新增或修改一種資料格式

1. 改 `site/lib/schemas.ts`：`z.strictObject` ＋ `.meta({ id, title, description })`，加一個 `parseXxx = parser(XxxSchema, '中文名稱')`
2. 新的 schema 要加進 `site/lib/schema-files.ts` 的 `SCHEMAS`（檔名 → schema）
3. `npm run schemas`：重新產生 `schemas/*.schema.json` 和 `src/invest/schemas/*.py`
4. Python 端：寫出資料前 `validated(Model, data)`，用 `write_json()` 寫檔
5. 網頁端：`parseXxx(await res.json())`
6. **檢查兩邊判斷是否一致**：
   ```bash
   uv run python .claude/skills/zod/scripts/parity_check.py <schema 檔名> <一份正確的資料.json>
   # 例：uv run python .claude/skills/zod/scripts/parity_check.py price-series public/data/prices/VT.json
   ```
   它會自動做出多餘欄位、少欄位、null、日期格式錯、日期改成數字、數字改成字串、整數改成小數等情況，分別交給 zod 和 Pydantic，列出判斷不同的地方。有 ❌ 就要處理（通常是 schema 寫法或產生器選項）
7. `npm test`（含 `tests/site/lib/schemas.test.ts` 的同步檢查）與 `uv run pytest`（含 `tests/acceptance/test_schemas.py`）都要過

## 產生器的設定（scripts/generate_models.py）

這些選項都是為了讓 Pydantic 和 zod 判斷一致，用 parity_check 實測過，不要拿掉：

| 選項 | 為什麼 |
|---|---|
| `strict_types=[str, int, float, bool]` | Pydantic 預設把 `"100.5"` 轉成數字照樣接受，zod 拒絕 |
| `use_missing_sentinel` ＋ `target_pydantic_version=2.14` | 選填欄位預設產生 `X \| None = None`，會接受 null；改用 `MISSING` 區分「沒給」和「給了 null」（`strict_nullable` 實測沒效果） |
| `use_title_as_name` | 用 zod 的 title 當類別名稱 |
| `formatters=[builtin]` | 不受有沒有裝 black／isort 影響，同步測試才能逐字比對 |

## 錯誤訊息

`parser()` 把 zod 的 issues 轉成「`欄位路徑: 訊息`」並用「；」連接，例如 `價格資料的格式不對：currency: Invalid option: expected one of "TWD"|"USD"`。需要給人看的多行版本用 `z.prettifyError(error)`（每個問題一行，附 `→ at 路徑`）。

## 參考資料

- `references/zod4-api.md`：zod 4 常用 API 速查（物件、字串格式、數字、聯集、錯誤、中繼資料、`z.toJSONSchema` 選項），要寫新 schema 時讀
- `references/cross-language.md`：zod → JSON Schema → Pydantic 三邊對照表、Python 端的陷阱、測試怎麼保證同步，要改產生流程或遇到兩邊不一致時讀

## Scripts

- `scripts/parity_check.py`：zod 與 Pydantic 對同一份資料的判斷是否一致（上面第 6 步）
- `scripts/zod-check.ts`：parity_check 的 zod 端，從 stdin 讀資料驗證
- `scripts/verify-zod.ts`：驗證這份 skill 寫的 zod 行為；升級 zod 後執行
