# zod 4 常用 API 速查

2026-11-04 依 [zod.dev](https://zod.dev/api) 整理，zod 4.6.7 實測（`scripts/verify-zod.ts`）。

## 目錄

- 基本型別與數字
- 字串格式（日期、email…）
- 物件的三種模式
- 必填、選填、可為空
- 列舉、陣列、聯集
- 自訂檢查與轉換（跨語言時要小心）
- 型別推導
- 錯誤
- 中繼資料
- z.toJSONSchema
- 和 zod 3 不同的地方

## 基本型別與數字

```ts
z.string(); z.number(); z.boolean(); z.null(); z.unknown();
z.int();      // 安全整數範圍，JSON Schema 是 integer
z.number();   // 拒絕 NaN 與 Infinity
z.number().positive(); .nonnegative(); .gte(0); .lte(100); .multipleOf(0.01);
z.coerce.number();  // 先轉型再驗證（跨語言資料不要用：Python 端不會轉）
```

## 字串格式

```ts
z.iso.date();                      // YYYY-MM-DD，會擋 2025-02-30；JSON Schema format: date
z.iso.datetime();                  // 預設要有 Z、不接受 +08:00
z.iso.datetime({ offset: true });  // 接受 +08:00
z.iso.time();
z.email(); z.url(); z.uuid();      // zod 4：格式是頂層函式（zod 3 是 z.string().email()）
z.string().min(1).max(20).regex(/^\d+$/);
```

`z.date()` 驗證的是 JS 的 `Date` 物件，不是字串，而且轉不了 JSON Schema。

## 物件的三種模式

| 寫法 | 多餘欄位 | JSON Schema |
|---|---|---|
| `z.object({...})` | **默默丟掉**，照樣通過 | `additionalProperties: false` |
| `z.strictObject({...})` | 拒絕（`unrecognized_keys`） | `additionalProperties: false` |
| `z.looseObject({...})` | 保留 | `additionalProperties: {}` |

跨語言一律用 `z.strictObject`：`z.object` 和它轉出的 JSON Schema 一樣，但網頁的行為和 Pydantic 不一樣。

常用：`.shape`、`.extend({...})`、`.pick({ a: true })`、`.omit({ a: true })`、`.partial()`、`.required()`。

## 必填、選填、可為空

| 寫法 | 沒給 | 給 null | JSON Schema |
|---|---|---|---|
| `x: z.number()` | ❌ | ❌ | 在 `required` |
| `x: z.number().optional()` | ✅ | ❌ | 不在 `required` |
| `x: z.number().nullable()` | ❌ | ✅ | 在 `required`，`type: ["number","null"]`（帶格式的字串是 `anyOf`） |
| `x: z.number().nullish()` | ✅ | ✅ | 不在 `required`，可為 null |
| `x: z.number().exactOptional()` | ✅ | ❌（連 `undefined` 也不行） | 同 optional |

## 列舉、陣列、聯集

```ts
z.enum(['TWD', 'USD']);                // 型別 'TWD' | 'USD'
z.literal('buy');
z.array(z.number()).min(1).max(100);   // .nonempty() 同 .min(1)
z.tuple([z.string(), z.number()]);
z.union([A, B]);                       // 第一個符合的
z.discriminatedUnion('type', [Buy, Sell]);  // 用欄位區分，錯誤訊息比較清楚
z.record(z.string(), z.number());      // zod 4 一定要兩個參數
```

## 自訂檢查與轉換（跨語言時要小心）

```ts
z.array(z.number()).refine((v) => v.length > 2, { error: '至少 3 筆' });
z.object({...}).superRefine((v, ctx) => { ctx.addIssue({ code: 'custom', message: '…', path: ['end'] }); });
z.string().transform((s) => s.trim());
z.codec(inSchema, outSchema, { decode, encode });  // 雙向轉換
```

- `.refine()`／`.superRefine()`：**轉 JSON Schema 時被默默忽略**，Python 不會檢查
- `.transform()`、`z.codec()`、`z.date()`：轉 JSON Schema 會丟錯
- 錯誤訊息參數是 `error`（zod 3 是 `message`）

## 型別推導

```ts
type PriceSeries = z.infer<typeof PriceSeriesSchema>;  // 輸出型別（= z.output）
type In = z.input<typeof Schema>;                       // 輸入型別（有 transform 時才不同）
```

## 錯誤

```ts
const r = Schema.safeParse(value);    // 不丟錯，回傳 { success, data } 或 { success: false, error }
Schema.parse(value);                  // 失敗丟 ZodError
r.error.issues;                       // [{ code, path: ['dates', 0], message, ... }]
z.prettifyError(r.error);             // 「✖ 訊息\n  → at dates[0]」，給人看
z.treeifyError(r.error);              // 依 schema 結構的巢狀物件（.properties?.x?.errors）
z.flattenError(r.error);              // { formErrors, fieldErrors }，適合表單
```

`z.formatError()` 已經不建議使用，改用 `z.treeifyError()`。

## 中繼資料

```ts
Schema.meta({ id: 'PriceSeries', title: 'PriceSeries', description: '…' });
z.string().describe('說明');   // 等於 .meta({ description })
```

- 中繼資料存在全域 registry（`z.globalRegistry`），綁定在**這個 schema 實例**上：之後再 `.refine()`／`.optional()` 會產生新實例，中繼資料不會跟過去，所以 `.meta()` 放在最後
- `id` 不能重複，重複會丟錯
- `title`、`description` 會出現在 JSON Schema（巢狀也會）；有 `id` 的 schema 會放進 `$defs` 用 `$ref` 引用

## z.toJSONSchema

```ts
z.toJSONSchema(Schema);   // 預設 Draft 2020-12
z.toJSONSchema(Schema, {
  target: 'draft-07',          // 也可以 'draft-04'、'openapi-3.0'
  unrepresentable: 'any',      // 轉不過去的型別改成 {}（預設丟錯）
  reused: 'ref',               // 重複用到的 schema 放進 $defs（預設內嵌）
  io: 'input',                 // 產生輸入型別（預設輸出）
});
```

反方向 `z.fromJSONSchema()` 官方標示**實驗性、不屬於穩定 API**，本 repo 不用。

## 和 zod 3 不同的地方（常見的舊寫法）

| zod 3 | zod 4 |
|---|---|
| `z.string().email()` | `z.email()` |
| `z.string().datetime()` | `z.iso.datetime()` |
| `.strict()`、`.passthrough()` | `z.strictObject()`、`z.looseObject()` |
| `{ message: '…' }` | `{ error: '…' }` |
| `z.nativeEnum(E)` | `z.enum(E)` |
| `z.record(z.number())` | `z.record(z.string(), z.number())` |
| `error.format()`、`error.flatten()` | `z.treeifyError()`、`z.flattenError()` |
| 第三方 zod-to-json-schema | 內建 `z.toJSONSchema()` |

## 資料來源

- [Zod：API](https://zod.dev/api)
- [Zod：錯誤格式](https://zod.dev/error-formatting)
- [Zod：中繼資料](https://zod.dev/metadata)
- [Zod：JSON Schema](https://zod.dev/json-schema)
