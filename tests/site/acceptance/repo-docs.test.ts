// repo 本身的文件（#29）：GitHub 上的相對連結、決策索引、README 的文章清單
// 網站的連結由 links.test.ts 檢查（讀 dist）；這裡檢查原始 Markdown 在 GitHub 上點不點得到
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { expect, test } from 'vitest';
import { publishedDocs } from '../support/docs';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.venv', '.git', 'data', 'private', '.astro', '.pytest_cache']);

function markdownFiles(dir = '.'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return SKIP_DIRS.has(e.name) || e.name.endsWith('-workspace') ? [] : markdownFiles(path);
    return /\.mdx?$/.test(e.name) ? [path] : [];
  });
}

/** 去掉程式碼區塊與行內程式碼，避免把範例裡的連結當真 */
const withoutCode = (text: string) => text.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');

test('[#29-1] repo 裡 Markdown 的相對連結都指向存在的檔案（GitHub 上點得到）', () => {
  const files = markdownFiles();
  expect(files.length, '有找到 Markdown 檔').toBeGreaterThan(20);
  const broken = files.flatMap((file) =>
    [...withoutCode(readFileSync(file, 'utf8')).matchAll(/\]\(([^)\s]+)\)/g)]
      .map(([, href]) => href)
      .filter((href) => !/^([a-z]+:|#|\/)/i.test(href))
      .map((href) => decodeURIComponent(href.split('#')[0].split('?')[0]))
      .filter((target) => target && !existsSync(join(dirname(file), target)))
      .map((target) => `${relative('.', file)} → ${target}`),
  );
  expect(broken).toEqual([]);
});

test('[#29-2] 決策索引列出每一份決策', () => {
  const index = readFileSync('docs/decisions/README.md', 'utf8');
  const missing = readdirSync('docs/decisions')
    .filter((f) => /^\d{4}-.+\.mdx?$/.test(f))
    .filter((f) => !index.includes(`](${f})`));
  expect(missing).toEqual([]);
});

test('[#29-3] README 依新手路線順序列出每一篇知識文章，並連到名詞解釋', () => {
  const readme = readFileSync('README.md', 'utf8');
  const order = (slug: string) => {
    const file = readdirSync('docs/knowledge').find((f) => f.startsWith(`${slug}.`))!;
    return Number(readFileSync(`docs/knowledge/${file}`, 'utf8').match(/^\s+order:\s*(\d+)/m)![1]);
  };
  const route = publishedDocs('knowledge')
    .sort((a, b) => order(a.slug) - order(b.slug))
    .map((d) => d.slug);
  const listed = [...readme.matchAll(/\]\(docs\/knowledge\/([^)]+?)\.mdx?\)/g)].map(([, slug]) => slug);
  expect(listed).toEqual(route);
  expect(readme).toMatch(/\]\(docs\/glossary\/?\)/);
});
