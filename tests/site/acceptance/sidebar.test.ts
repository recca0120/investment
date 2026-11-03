// 驗收：文章頁的側欄（Starlight autogenerate 設錯目錄時，側欄會是空的，但 build 不會報錯）
import { readFileSync, readdirSync } from 'node:fs';
import { within } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { openPage } from '../support/dist';

/** docs/ 裡會發佈的文章：{ 路徑, 標題 }，標題取自 frontmatter */
function publishedDocs(section: string) {
  return readdirSync(`docs/${section}`)
    .filter((f) => /\.mdx?$/.test(f) && f !== 'README.md')
    .map((f) => ({
      path: `${section}/${f.replace(/\.mdx?$/, '')}/`,
      title: readFileSync(`docs/${section}/${f}`, 'utf8').match(/^title:\s*(.+)$/m)![1].trim(),
    }));
}

describe('側欄', () => {
  const docs = ['knowledge', 'decisions', 'log'].flatMap(publishedDocs);

  test('[#15-1] 文章頁的側欄列出每一篇文章，目前頁面標示為 aria-current', () => {
    const current = docs[0];
    const { screen } = openPage(current.path);
    const nav = within(screen.getByRole('navigation', { name: '主要' }));

    for (const doc of docs) {
      expect(nav.getByRole('link', { name: doc.title }), doc.path).toHaveAttribute('href', `/investment/${doc.path}`);
    }
    expect(nav.getByRole('link', { name: current.title })).toHaveAttribute('aria-current', 'page');
  });
});
