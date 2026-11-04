// parity_check.py 的 zod 端：從 stdin 讀一串資料，用 site/lib/schema-files.ts 的 SCHEMAS[<檔名>] 驗證
// 用法（通常由 parity_check.py 呼叫）：echo '[{...}]' | node .claude/skills/zod/scripts/zod-check.ts price-series.schema.json
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [name] = process.argv.slice(2);
const { SCHEMAS } = await import(pathToFileURL(resolve('site/lib/schema-files.ts')).href);
const schema = SCHEMAS[name];
if (!schema) {
  console.error(`site/lib/schema-files.ts 的 SCHEMAS 裡沒有 ${name}，可用的有：${Object.keys(SCHEMAS).join('、')}`);
  process.exit(2);
}
const values: unknown[] = JSON.parse(readFileSync(0, 'utf8'));
console.log(
  JSON.stringify(
    values.map((v) => {
      const r = schema.safeParse(v);
      return r.success ? { ok: true } : { ok: false, why: r.error.issues.map((i: { path: unknown[]; message: string }) => `${i.path.join('.')}: ${i.message}`).join('；') };
    }),
  ),
);
