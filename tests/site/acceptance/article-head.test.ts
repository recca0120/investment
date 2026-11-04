// 驗收：文章開頭先看到重點、結尾的資料來源收合、文章 07 的結果用分頁（#22，決策 0006）
import { readFileSync } from 'node:fs';
import { within } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { openPage } from '../support/dist';
import { SECTIONS, publishedDocs } from '../support/docs';

const knowledge = publishedDocs('knowledge');
const source = (path: string) => {
  const [section, slug] = path.split('/');
  for (const ext of ['md', 'mdx']) {
    try {
      return readFileSync(`docs/${section}/${slug}.${ext}`, 'utf8');
    } catch {}
  }
  throw new Error(`找不到 ${path} 的原稿`);
};

describe('重點摘要', () => {
  test.each(knowledge)('[#22-5] $slug：標題下方先看到「重點」，最多 3 點', ({ path }) => {
    const { screen, document } = openPage(path);
    const box = screen.getByRole('region', { name: '重點' });
    const points = within(box).getAllByRole('listitem');
    expect(points.length).toBeGreaterThanOrEqual(1);
    expect(points.length).toBeLessThanOrEqual(3);

    // 在內文第一個段落標題之前
    const firstHeading = document.querySelector('.sl-markdown-content h2');
    if (firstHeading) {
      expect(box.compareDocumentPosition(firstHeading) & 4 /* DOCUMENT_POSITION_FOLLOWING */, '重點要在內文標題之前').toBeTruthy();
    }
  });
});

describe('資料來源收合', () => {
  const withSources = SECTIONS.flatMap(({ dir }) => publishedDocs(dir)).filter((d) =>
    /^## 資料來源/m.test(source(d.path)),
  );

  test('有找到含資料來源的文章', () => {
    expect(withSources.length).toBeGreaterThan(10);
  });

  test.each(withSources)('[#22-14] $path：資料來源預設收合、標示筆數，不列在本頁內容', ({ path }) => {
    const expected = (source(path).split(/^## 資料來源/m)[1].match(/\]\(https?:\/\//g) ?? []).length;
    const { document, screen } = openPage(path);

    const details = [...document.querySelectorAll('.sl-markdown-content details')].find((d) =>
      d.querySelector('summary')?.textContent?.includes('資料來源'),
    );
    expect(details, '找不到收合的資料來源').toBeDefined();
    expect(details!.querySelector('summary')!.textContent!.trim()).toBe(`資料來源（${expected} 筆）`);
    expect(details!.hasAttribute('open'), '預設要收合').toBe(false);
    expect(details!.querySelectorAll('a[href^="http"]')).toHaveLength(expected);

    const toc = screen.queryAllByRole('navigation').find((n) => /本頁內容/.test(n.textContent ?? ''));
    if (toc) expect(within(toc).queryByRole('link', { name: '資料來源' })).toBeNull();
  });
});

test('[#22-3] 文章 07 的回測結果用分頁切換：含息／只看價格／換算新台幣', () => {
  const { screen } = openPage('knowledge/07-dca-backtest-2016-2026/');
  const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
  expect(tabs.map((t) => t.textContent!.trim())).toEqual(['含息', '只看價格', '換算新台幣']);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  const { document } = openPage('knowledge/07-dca-backtest-2016-2026/');
  for (const tab of tabs) {
    // Starlight 的分頁用 href 指向面板（hidden 的面板 Testing Library 算不出名稱，所以直接用 id）
    const panel = document.getElementById(tab.getAttribute('href')!.slice(1));
    expect(panel, `${tab.textContent} 的面板`).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('tabpanel');
    expect(panel!.querySelector('table'), `${tab.textContent} 的面板裡要有結果表`).not.toBeNull();
  }
});
