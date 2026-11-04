// 顏色只能來自設計 token（site/design/tokens.ts），元件、頁面、樣式檔都不寫死顏色，改配色時只改一個地方
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const files = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && ext.test(e.name))
    .map((e) => join(e.parentPath, e.name));

// #fff、#e9efec（前面接 [ : 空白或引號，避免誤判 href="#_top"）、rgb()/hsl()/oklch()、具名的 Tailwind 色盤（bg-red-500）
const HARDCODED = /(?:[\[:\s'"(])#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(|\b(?:bg|text|border|ring|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|zinc|neutral|stone)-\d{2,3}\b/i;

test('[#17-3] 元件和頁面裡沒有寫死的顏色值', () => {
  const offenders = [...files('site/components', /\.astro$/), ...files('docs', /\.mdx$/)].flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .map((line, i) => ({ line, at: `${f}:${i + 1}` }))
      .filter(({ line }) => HARDCODED.test(line))
      .map(({ line, at }) => `${at}  ${line.trim()}`),
  );
  expect(offenders).toEqual([]);
});

test('[#17-2] 元件只用 utility class，沒有 <style>', () => {
  // 實際案例：ReadingOrder 的 Tailwind 改寫被 git checkout 意外還原，只檢查 Passbook 的測試沒發現
  const withStyle = files('site/components', /\.astro$/).filter((f) => /<style[\s>]/.test(readFileSync(f, 'utf8')));
  expect(withStyle).toEqual([]);
});

test('[#22-13] site/styles/ 的樣式檔沒有寫死的顏色值（產生的 generated/ 除外）', () => {
  const offenders = files('site/styles', /\.css$/)
    .filter((f) => !f.includes('/generated/'))
    .flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${f}:${i + 1}` }))
        .filter(({ line }) => HARDCODED.test(line))
        .map(({ line, at }) => `${at}  ${line.trim()}`),
    );
  expect(offenders).toEqual([]);
});
