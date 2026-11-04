// 網站與 Python 共用資料格式（#44，決策 0009）：zod 是唯一來源
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { jsonSchemaFiles } from '../../../site/lib/schema-files';
import { parseGolden, parsePriceIndex, parsePriceSeries, parseFxSeries } from '../../../site/lib/schemas';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe('JSON Schema 和 zod 同步', () => {
  const committed = existsSync('schemas') ? readdirSync('schemas').filter((f) => f.endsWith('.schema.json')).sort() : [];

  test('[#44-1] 產生的檔案名稱和 schemas/ 裡的一致（沒有多、沒有少）', () => {
    expect(Object.keys(jsonSchemaFiles()).sort()).toEqual(committed);
  });

  test.each(committed)('[#44-1] %s 和 zod 產生的內容相同（改了 zod 要執行 npm run schemas）', (name) => {
    expect(readFileSync(`schemas/${name}`, 'utf8')).toBe(jsonSchemaFiles()[name]);
  });
});

describe('[#44-3] 網頁讀資料時驗證格式', () => {
  test('真實的資料都通過驗證', () => {
    const index = parsePriceIndex(read('public/data/prices/index.json'));
    for (const { symbol } of index.symbols) parsePriceSeries(read(`public/data/prices/${symbol}.json`));
    parseFxSeries(read('public/data/prices/USDTWD.json'));
    parseGolden(read('tests/site/fixtures/backtest-golden.json'));
  });

  test('[#44-3] 幣別不對、日期格式錯、少了欄位時，錯誤訊息指出是哪個欄位', () => {
    const good = { symbol: 'VT', currency: 'USD', dates: ['2025-01-02'], close: [100], total: [100] };
    expect(() => parsePriceSeries({ ...good, currency: 'JPY' })).toThrow(/currency/);
    expect(() => parsePriceSeries({ ...good, dates: ['2025/01/02'] })).toThrow(/dates/);
    const { total: _omit, ...missing } = good;
    expect(() => parsePriceSeries(missing)).toThrow(/total/);
  });
});

describe('網頁和 Python 判斷一致', () => {
  test('[#46-1] 多餘的欄位：網頁也要拒絕（產生的 Pydantic 模型是 extra=forbid）', () => {
    const good = { symbol: 'VT', currency: 'USD', dates: ['2025-01-02'], close: [100], total: [100] };
    expect(() => parsePriceSeries({ ...good, volume: [1] })).toThrow(/volume|Unrecognized/);
    expect(() => parseFxSeries({ dates: ['2025-01-02'], toUsd: [30], toTwd: [30], note: 'x' })).toThrow(/note|Unrecognized/);
  });
});
