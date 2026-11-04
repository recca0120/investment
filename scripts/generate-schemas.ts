// 從 zod（site/lib/schemas.ts）產生 schemas/*.schema.json（#44，決策 0009）
// 用法：npm run schemas（會接著產生 Python 的 Pydantic 模型）
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { jsonSchemaFiles } from '../site/lib/schema-files.ts';

mkdirSync('schemas', { recursive: true });
for (const old of readdirSync('schemas').filter((f) => f.endsWith('.schema.json'))) rmSync(`schemas/${old}`);
for (const [name, content] of Object.entries(jsonSchemaFiles())) {
  writeFileSync(`schemas/${name}`, content);
  console.log(`schemas/${name}`);
}
