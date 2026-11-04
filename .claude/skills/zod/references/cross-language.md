# zod → JSON Schema → Pydantic：三邊對照與陷阱

2026-11-04 實測：zod 4.6.7、datamodel-code-generator 0.88.0、pydantic 2.14.2，用本 repo 的 `scripts/generate_models.py` 設定。

## 三邊對照

| zod | JSON Schema | Pydantic（產生的） | 備註 |
|---|---|---|---|
| `z.strictObject({...}).meta({ title: 'X' })` | `type: object`、`additionalProperties: false`、`title: X` | `class X(BaseModel)`、`extra='forbid'` | 不要用 `z.object`（網頁會丟掉多餘欄位、照樣通過） |
| `z.string().min(1)` | `type: string`、`minLength: 1` | `constr(min_length=1)`（strict） | |
| `z.number()` | `type: number` | `StrictFloat`（有範圍時 `confloat(gt=0.0, strict=True)`） | strict：拒絕 `"1.5"` 字串，接受整數 `1`（和 zod 一樣） |
| `z.int().positive()` | `type: integer`、`exclusiveMinimum: 0`、`maximum: 2^53-1` | `conint(le=9007199254740991, gt=0, strict=True)` | |
| `z.boolean()` | `type: boolean` | `StrictBool` | |
| `z.enum(['TWD','USD'])` | `enum: [TWD, USD]` | `class Currency(StrEnum)` | |
| `z.iso.date()` | `format: date`＋pattern | `RootModel[date]` | 寬鬆模式下也拒絕數字（parity_check 測過） |
| `z.array(X).min(1)` | `type: array`、`minItems: 1` | `list[X] = Field(..., min_length=1)` | |
| `.optional()` | 不在 `required` | `X \| MISSING = MISSING` | 用 `use_missing_sentinel`；預設會變成 `X \| None = None`（接受 null，和 zod 不同） |
| `.nullable()` | 在 `required`、可為 null | `X \| None`（必填） | 寫出時要用 `exclude_unset`，不能用 `exclude_none` |
| `z.array(...)` 當根 | `type: array` | `class X(RootModel[list[...]])` | 用 `X.model_validate(list)` |
| `.refine()` | **不出現** | 不檢查 | 跨語言的複雜規則要兩邊各寫 |
| `z.date()`、`.transform()` | 轉換失敗 | — | 不要用在共用格式 |

每個產生的模組最後都有 `class Model(RootModel[...])`，parity_check 用它驗證。

## Python 端的陷阱

| 症狀 | 原因 | 解法 |
|---|---|---|
| 網頁讀 JSON 時 `JSON.parse` 失敗 | `json.dumps` 預設寫出 `NaN`／`Infinity` | 用 `invest.export.write_json()`（`allow_nan=False`，先轉字串再寫檔，不留壞檔） |
| 網頁說「`recovered`: expected string, received undefined」 | `model_dump(exclude_none=True)` 把 nullable 欄位的 null 拿掉 | 用 `exclude_unset=True`（`validated()` 已經這樣做） |
| 整數變成小數（`5000` → `5000.0`） | 欄位是 `z.number()`，Pydantic 是 float | 數值一樣，網頁沒差；真的要整數就用 `z.int()` |
| 同步測試在別台電腦失敗、但沒改 schema | 產生器的格式化工具不同（有沒有裝 black／isort） | 產生器固定 `formatters=[builtin]` |
| `AttributeError: StrictTypes` | 0.88 的 `StrictTypes`、`TargetPydanticVersion` 不在頂層 | `from datamodel_code_generator.enums import StrictTypes, TargetPydanticVersion` |

## 測試怎麼保證同步

| 檢查 | 測試 | 抓得到 |
|---|---|---|
| zod → JSON Schema | `tests/site/lib/schemas.test.ts`（`[#44-1]`） | 改了 zod 沒跑 `npm run schemas` |
| JSON Schema → Pydantic | `tests/acceptance/test_schemas.py`（`[#44-1]`） | JSON Schema 改了、Python 模型沒重新產生 |
| 判斷是否一致 | `scripts/parity_check.py`（手動）、`test_schemas.py` 的回歸測試（`[#46-1]`） | 兩邊對同一份資料的接受／拒絕不同 |
| 計算結果一致 | `tests/site/lib/backtest.test.ts`（`[#41-2]`，標準答案） | 格式對、但 TypeScript 算錯 |

故意弄壞確認過（2026-11-04）：改 zod 沒重新產生 → TS 測試失敗；只重新產生 JSON Schema → Python 測試失敗；拿掉 `strict_types` → parity_check 出現「數字改成字串」不一致。

## 資料來源

- [datamodel-code-generator](https://github.com/koxudaxi/datamodel-code-generator)（`--strict-types`、`--use-missing-sentinel`、`--use-title-as-name`、`--formatters`）
- [Pydantic：Strict Mode](https://docs.pydantic.dev/latest/concepts/strict_mode/)
- [Zod：JSON Schema](https://zod.dev/json-schema)
