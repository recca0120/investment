// 驗收測試的入口：讀取 astro build 產生的 dist/ HTML，用 Testing Library 以使用者看得到的方式查詢
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { within } from '@testing-library/dom';
import { Window } from 'happy-dom';

export const DIST = 'dist';
export const BASE = '/investment/';
const ORIGIN = 'https://recca0120.github.io';

function ensureBuilt() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('找不到 dist/index.html：先執行 npm run build（或用 npm run test:site）');
  }
}

/** 打開一個 build 好的頁面，path 不含 base，例如 'knowledge/01-getting-started/'；首頁是 '' */
export function openPage(path: string) {
  ensureBuilt();
  const { document } = new Window({ url: `${ORIGIN}${BASE}${path}` });
  document.write(readFileSync(join(DIST, path, 'index.html'), 'utf8'));
  return { document: document as unknown as Document, screen: within(document.body as unknown as HTMLElement) };
}

/** 列出所有頁面的路徑（不含 base），例如 ['', 'knowledge/01-getting-started/', …] */
export function allPages(): string[] {
  ensureBuilt();
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'index.html') {
        const rel = relative(DIST, dir).split(sep).join('/');
        pages.push(rel ? `${rel}/` : '');
      }
    }
  };
  walk(DIST);
  return pages.sort();
}

/** 站內連結（以 base 開頭的 href）是否指向 dist/ 裡存在的檔案 */
export function existsInDist(href: string): boolean {
  const path = href.slice(BASE.length).split('#')[0].split('?')[0];
  const target = join(DIST, decodeURIComponent(path));
  return (existsSync(target) && statSync(target).isFile()) || existsSync(join(target, 'index.html'));
}
