// 驗證這份 skill 寫的 zod 行為（2026-11-04 用 zod 4.6.7 全部通過）
// 升級 zod 後重跑：node .claude/skills/zod/scripts/verify-zod.ts
// 有任何一條失敗，代表 SKILL.md／references 的說法要更新
import { z } from 'zod';

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : `\n   實際：${JSON.stringify(actual)}\n   預期：${JSON.stringify(expected)}`}`);
}
const schemaOf = (s: z.ZodType) => {
  const { $schema: _, ...rest } = z.toJSONSchema(s) as Record<string, unknown>;
  return rest;
};

// 物件的三種模式
check('z.object 默默丟掉多餘欄位', z.object({ a: z.number() }).safeParse({ a: 1, b: 2 }).data, { a: 1 });
check('z.strictObject 拒絕多餘欄位', z.strictObject({ a: z.number() }).safeParse({ a: 1, b: 2 }).error?.issues[0].code, 'unrecognized_keys');
check('z.looseObject 保留多餘欄位', z.looseObject({ a: z.number() }).safeParse({ a: 1, b: 2 }).data, { a: 1, b: 2 });
check('z.object 和 z.strictObject 轉出的 JSON Schema 一樣（都是 additionalProperties: false）',
  schemaOf(z.object({ a: z.number() })), schemaOf(z.strictObject({ a: z.number() })));
check('z.looseObject 轉出 additionalProperties: {}', schemaOf(z.looseObject({ a: z.number() })).additionalProperties, {});

// 必填、選填、可為 null
check('optional → 不在 required', schemaOf(z.object({ t: z.number().optional() })).required, undefined);
check('nullable 單純字串 → 必填，type: ["string", "null"]', schemaOf(z.object({ r: z.string().nullable() })), {
  type: 'object', properties: { r: { type: ['string', 'null'] } }, required: ['r'], additionalProperties: false,
});
check('nullable 帶格式的字串（日期）→ anyOf: [日期, null]',
  ((schemaOf(z.object({ r: z.iso.date().nullable() })).properties as Record<string, { anyOf: { type: string }[] }>).r.anyOf).map((s) => s.type),
  ['string', 'null']);

// 數字與日期
check('z.number 拒絕 NaN', z.number().safeParse(Number.NaN).success, false);
check('z.number 拒絕 Infinity', z.number().safeParse(Number.POSITIVE_INFINITY).success, false);
check('z.int → integer（安全整數範圍）', schemaOf(z.int()).type, 'integer');
check('z.iso.date 接受 YYYY-MM-DD', z.iso.date().safeParse('2025-01-02').success, true);
check('z.iso.date 拒絕 2025/01/02', z.iso.date().safeParse('2025/01/02').success, false);
check('z.iso.date 拒絕不存在的日期 2025-02-30', z.iso.date().safeParse('2025-02-30').success, false);
check('z.iso.date → format: date', schemaOf(z.iso.date()).format, 'date');

// 轉不過去或被忽略的
let dateError = '';
try { z.toJSONSchema(z.date()); } catch (e) { dateError = (e as Error).message; }
check('z.date() 轉 JSON Schema 會丟錯', dateError.includes('cannot be represented'), true);
check('.refine() 轉 JSON Schema 時被默默忽略', schemaOf(z.array(z.number()).refine((v) => v.length > 2)), { type: 'array', items: { type: 'number' } });

// 中繼資料
check('.meta({ title }) 會出現在 JSON Schema（巢狀也會）',
  (schemaOf(z.object({ x: z.object({ y: z.number() }).meta({ title: 'Inner' }) })).properties as Record<string, { title: string }>).x.title, 'Inner');
check('.describe() → description', schemaOf(z.string().describe('說明')).description, '說明');

// 錯誤訊息
const bad = z.strictObject({ currency: z.enum(['TWD', 'USD']), dates: z.array(z.iso.date()) }).safeParse({ currency: 'JPY', dates: ['2025/01/02'] });
check('issues 的 path 指出欄位', bad.error?.issues.map((i) => i.path), [['currency'], ['dates', 0]]);
check('z.prettifyError 一行一個問題，附「→ at 路徑」', z.prettifyError(bad.error!).split('\n').filter((l) => l.includes('→ at')), ['  → at currency', '  → at dates[0]']);


// references/zod4-api.md 裡的其他說法
check('nullish → 沒給、給 null 都可以', [z.number().nullish().safeParse(undefined).success, z.number().nullish().safeParse(null).success], [true, true]);
check('exactOptional：沒給可以，給 undefined 不行',
  [z.strictObject({ a: z.number().exactOptional() }).safeParse({}).success, z.strictObject({ a: z.number().exactOptional() }).safeParse({ a: undefined }).success], [true, false]);
check('optional 給 null 不行', z.strictObject({ a: z.number().optional() }).safeParse({ a: null }).success, false);
check('z.int().positive() → exclusiveMinimum: 0', schemaOf(z.int().positive()).exclusiveMinimum, 0);
check('z.iso.datetime 預設不接受 +08:00', z.iso.datetime().safeParse('2025-01-02T10:00:00+08:00').success, false);
check('z.iso.datetime({ offset: true }) 接受 +08:00', z.iso.datetime({ offset: true }).safeParse('2025-01-02T10:00:00+08:00').success, true);
check('z.email() 是頂層函式', z.email().safeParse('a@b.co').success, true);
check('z.record 兩個參數', z.record(z.string(), z.number()).safeParse({ a: 1 }).success, true);
const Trade = z.discriminatedUnion('type', [z.strictObject({ type: z.literal('buy'), qty: z.number() }), z.strictObject({ type: z.literal('sell'), qty: z.number() })]);
check('discriminatedUnion 依 type 選擇', [Trade.safeParse({ type: 'buy', qty: 1 }).success, Trade.safeParse({ type: 'hold', qty: 1 }).success], [true, false]);
check('treeifyError、flattenError 存在', [typeof z.treeifyError, typeof z.flattenError], ['function', 'function']);
check('refine 的錯誤參數是 error', z.number().refine((v) => v > 0, { error: '要大於 0' }).safeParse(-1).error?.issues[0].message, '要大於 0');
check('.meta 之後再 .optional() 是新實例，中繼資料不跟過去', z.string().meta({ title: 'T' }).optional().meta()?.title, undefined);

console.log(failed ? `\n❌ ${failed} 條和 skill 寫的不一樣，請更新 skill` : '\n✅ 全部和 skill 寫的一致');
process.exit(failed ? 1 : 0);
