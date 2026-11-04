/** 從 zod 產生 schemas/*.schema.json 的內容（scripts/generate-schemas.ts 和測試共用，#44） */
import { z } from 'zod';
import { FxSeriesSchema, GoldenSchema, PriceIndexSchema, PriceSeriesSchema } from './schemas.ts';

const SCHEMAS = {
  'price-series.schema.json': PriceSeriesSchema,
  'fx-series.schema.json': FxSeriesSchema,
  'price-index.schema.json': PriceIndexSchema,
  'backtest-golden.schema.json': GoldenSchema,
} as const;

export function jsonSchemaFiles(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(SCHEMAS).map(([name, schema]) => [name, `${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n`]),
  );
}
