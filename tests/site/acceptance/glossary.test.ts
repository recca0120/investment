// 驗收：新手名詞解釋（#24）
import { readFileSync, readdirSync } from 'node:fs';
import { within } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { existsInDist, openPage } from '../support/dist';

const CATEGORIES = ['帳戶與交易', '商品類別', '常見代號', '報酬與風險', '策略', '成本與稅'];
const FIELDS = ['一句話', '用途', '例子', '新手注意'];

const files = () =>
  readdirSync('docs/glossary')
    .filter((f) => /^\d\d-.+\.md$/.test(f))
    .sort();

/** 把一頁名詞解釋拆成 { 名詞, 內容 }：每個 ### 是一個名詞 */
function entries(file: string) {
  const body = readFileSync(`docs/glossary/${file}`, 'utf8').split(/^## 資料來源/m)[0];
  return body
    .split(/^### /m)
    .slice(1)
    .map((chunk) => ({ term: chunk.split('\n')[0].trim(), text: chunk }));
}

describe('名詞解釋', () => {
  test('[#24-1] 頂部多一個「名詞解釋」分區，裡面依 6 類各一頁', () => {
    const { screen } = openPage(`glossary/${files()[0].replace(/\.md$/, '')}/`);
    const topics = within(screen.getAllByRole('navigation', { name: '網站分區' })[0]);
    expect(topics.getByRole('link', { name: '名詞解釋' })).toHaveAttribute('aria-current', 'page');

    const sidebar = within(screen.getByRole('navigation', { name: '主要' }));
    for (const category of CATEGORIES) {
      expect(sidebar.getByRole('link', { name: new RegExp(category) }), category).toBeInTheDocument();
    }
  });

  test.each(files())('[#24-2] %s：每個名詞都有一句話、用途、例子、新手注意，而且有網址錨點', (file) => {
    const list = entries(file);
    expect(list.length, `${file} 沒有名詞`).toBeGreaterThan(3);
    const missing = list.flatMap(({ term, text }) =>
      FIELDS.filter((f) => !new RegExp(`\\*\\*${f}\\*\\*：`).test(text)).map((f) => `${term} 缺「${f}」`),
    );
    expect(missing).toEqual([]);

    const { document } = openPage(`glossary/${file.replace(/\.md$/, '')}/`);
    const headings = [...document.querySelectorAll('.sl-markdown-content h3')];
    expect(headings.map((h) => h.textContent!.trim())).toEqual(list.map((e) => e.term));
    expect(headings.filter((h) => !h.id), '每個名詞標題都要有 id').toEqual([]);
  });

  test.each(files())('[#24-3] %s：開頭有資料日期，結尾的資料來源有出處', (file) => {
    const source = readFileSync(`docs/glossary/${file}`, 'utf8');
    expect(source).toMatch(/^> .*\d{4}-\d{2}-\d{2}/m);
    const sources = source.split(/^## 資料來源/m)[1] ?? '';
    expect(sources.match(/\]\(https?:\/\//g)?.length ?? 0, `${file} 的資料來源`).toBeGreaterThan(0);
  });

  test('[#24-4] 知識文章裡的名詞連到名詞解釋，而且錨點真的存在', () => {
    const { document } = openPage('knowledge/03-products-comparison/');
    const links = [...document.querySelectorAll<HTMLAnchorElement>('.sl-markdown-content a[href*="/glossary/"]')];
    expect(links.length, '文章 03 應該有連到名詞解釋的連結').toBeGreaterThan(5);
    for (const a of links) {
      const href = a.getAttribute('href')!;
      expect(existsInDist(href), href).toBe(true);
      const [path, hash] = href.replace('/investment/', '').split('#');
      expect(openPage(path).document.getElementById(decodeURIComponent(hash)), `${href} 的錨點`).not.toBeNull();
    }
  });

  test('[#24-5] 新手入門路線（第 1 站）開頭有名詞解釋的入口', () => {
    const { document } = openPage('knowledge/01-getting-started/');
    const content = document.querySelector('.sl-markdown-content')!;
    const firstSection = content.querySelector('.sl-heading-wrapper');
    const intro = [...content.children].slice(0, [...content.children].indexOf(firstSection!));
    const entry = intro.flatMap((el) => [...el.querySelectorAll('a')]).find((a) => /名詞解釋/.test(a.textContent!));
    expect(entry, '第一個段落標題之前要有「名詞解釋」連結').toBeDefined();
    expect(entry!.getAttribute('href')).toMatch(/^\/investment\/glossary\//);
  });
});
