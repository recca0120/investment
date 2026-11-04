/**
 * 網站與 Python 共用的資料格式（#44，決策 0009）：這裡是唯一來源
 *
 * 改了之後執行 `npm run schemas`：
 *   1. scripts/generate-schemas.ts → schemas/*.schema.json（z.toJSONSchema）
 *   2. scripts/generate_models.py  → src/invest/schemas/*.py（Pydantic，datamodel-code-generator）
 * 沒有重新產生的話，tests/site/lib/schemas.test.ts 與 tests/acceptance/test_schemas.py 會失敗
 *
 * 只用 JSON Schema 表達得出來的規則（型別、列舉、日期格式、必填）；
 * 「陣列長度要一樣」這類規則轉不過去，不寫在這裡
 */
import { z } from 'zod';

const isoDate = z.iso.date().describe('日期（YYYY-MM-DD）');
const Currency = z.enum(['TWD', 'USD']).describe('幣別：台股 TWD、美股 USD');
const numbers = z.array(z.number());

export const PriceSeriesSchema = z
  .object({
    symbol: z.string().min(1).describe('代號，例如 0050、VT'),
    currency: Currency,
    dates: z.array(isoDate).min(1).describe('交易日（由舊到新）'),
    close: numbers.describe('只調整股票分割的收盤價'),
    total: numbers.describe('含息還原價（股利再投入）'),
    totalTaxed: numbers.optional().describe('美股：股利扣 30% 預扣稅後的含息價'),
  })
  .meta({ id: 'PriceSeries', title: 'PriceSeries', description: '一檔的價格資料（public/data/prices/<代號>.json）' });

export const FxSeriesSchema = z
  .object({
    dates: z.array(isoDate).min(1),
    toUsd: numbers.describe('買美元的價格（銀行即期賣出）'),
    toTwd: numbers.describe('換回新台幣的價格（銀行即期買入）'),
  })
  .meta({ id: 'FxSeries', title: 'FxSeries', description: '美元兌新台幣匯率（public/data/prices/USDTWD.json）' });

export const PriceIndexSchema = z
  .object({
    symbols: z.array(
      z
        .object({ symbol: z.string().min(1), currency: Currency, first: isoDate, last: isoDate })
        .meta({ title: 'PriceIndexEntry' }),
    ),
  })
  .meta({ id: 'PriceIndex', title: 'PriceIndex', description: '網站回測器的代號清單（public/data/prices/index.json）' });

export const GoldenSchema = z
  .array(
    z
      .object({
        input: z
          .object({
            symbol: z.string().min(1),
            monthly: z.number().positive(),
            start: isoDate,
            end: isoDate,
            dividends: z.boolean(),
            twd: z.boolean(),
            tax: z.boolean(),
          })
          .meta({ title: 'GoldenInput' }),
        expected: z
          .object({
            totalInvested: z.number(),
            finalValue: z.number(),
            annualized: z.number(),
            maxDrawdown: z.number(),
            days: z.int().positive(),
            worst: z
              .object({ date: isoDate, invested: z.number(), value: z.number(), recovered: isoDate.nullable() })
              .meta({ title: 'GoldenWorst' }),
          })
          .meta({ title: 'GoldenExpected' }),
      })
      .meta({ title: 'GoldenCase' }),
  )
  .meta({ id: 'BacktestGolden', title: 'BacktestGolden', description: '網站回測器的標準答案（Python 算的）' });

export type PriceSeries = z.infer<typeof PriceSeriesSchema>;
export type FxSeries = z.infer<typeof FxSeriesSchema>;
export type PriceIndex = z.infer<typeof PriceIndexSchema>;
export type Golden = z.infer<typeof GoldenSchema>;

/** 解析並驗證；格式不符時丟出指出欄位的錯誤（例如「currency: Invalid option」） */
const parser =
  <T>(schema: z.ZodType<T>, what: string) =>
  (value: unknown): T => {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(根)'}: ${i.message}`).join('；');
    throw new Error(`${what}的格式不對：${issues}`);
  };

export const parsePriceSeries = parser(PriceSeriesSchema, '價格資料');
export const parseFxSeries = parser(FxSeriesSchema, '匯率資料');
export const parsePriceIndex = parser(PriceIndexSchema, '代號清單');
export const parseGolden = parser(GoldenSchema, '標準答案');
