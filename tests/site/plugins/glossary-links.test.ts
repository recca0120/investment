// rehype 外掛：知識文章裡的名詞第一次出現時，自動連到名詞解釋（#24）
import { expect, test } from 'vitest';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { VFile } from 'vfile';
import { within } from '@testing-library/dom';
import { Window } from 'happy-dom';
import rehypeGlossaryLinks from '../../../site/plugins/rehype-glossary-links.mjs';

const terms = [
  { term: 'ETF', href: '/investment/glossary/02-products/#etf' },
  { term: '市值型 ETF', href: '/investment/glossary/02-products/#市值型-etf' },
  { term: 'VT', href: '/investment/glossary/03-tickers/#vt' },
  { term: '殖利率', href: '/investment/glossary/04-return-risk/#殖利率' },
];

async function transform(html: string, path = 'docs/knowledge/01-a.md') {
  const file = new VFile({ value: html, path });
  const out = String(
    await unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeGlossaryLinks, { terms, contentDir: './docs', include: ['knowledge'] })
      .use(rehypeStringify)
      .process(file),
  );
  const { document } = new Window();
  document.body.innerHTML = out;
  return within(document.body as unknown as HTMLElement);
}

test('[#24-4] 名詞第一次出現時連到名詞解釋，同一篇只連第一次', async () => {
  const screen = await transform('<p>VT 是一檔 ETF，殖利率約 2%。</p><p>再提一次 VT 和 ETF。</p>');
  const links = screen.getAllByRole('link');
  expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['VT', '/investment/glossary/03-tickers/#vt'],
    ['ETF', '/investment/glossary/02-products/#etf'],
    ['殖利率', '/investment/glossary/04-return-risk/#殖利率'],
  ]);
});

test('[#24-4] 同一段文字裡名詞重複出現時，後面其他名詞仍然會連', async () => {
  const screen = await transform('<p>VT 是一檔 ETF，VT 的殖利率約 2%。</p>');
  expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['VT', 'ETF', '殖利率']);
});

test('[#24-4] 長的名詞優先；英文名詞要整個字相符（VTI 裡的 VT 不算）', async () => {
  const screen = await transform('<p>VTI 是美國全市場，市值型 ETF 是一種 ETF。</p>');
  const links = screen.getAllByRole('link');
  // 「市值型 ETF」整段連到它自己；後面單獨的 ETF 是另一個名詞，第一次出現所以也連
  expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['市值型 ETF', '/investment/glossary/02-products/#市值型-etf'],
    ['ETF', '/investment/glossary/02-products/#etf'],
  ]);
});

test('[#24-4] 引言（開頭的日期與免責說明）不連', async () => {
  const screen = await transform('<blockquote><p>不構成投資建議，VT 費率以官網為準</p></blockquote><p>VT</p>');
  expect(screen.getAllByRole('link').map((a) => a.closest('blockquote'))).toEqual([null]);
});

test('[#24-4] 標題、程式碼、已經是連結的文字不連；名詞解釋本身和其他區的文章不處理', async () => {
  const screen = await transform('<h2>ETF 是什麼</h2><p><code>VT</code> <a href="/x">殖利率</a></p><p>ETF</p>');
  expect(screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['殖利率', '/x'],
    ['ETF', '/investment/glossary/02-products/#etf'],
  ]);

  for (const path of ['docs/glossary/02-products.md', 'docs/decisions/0001-a.md']) {
    expect((await transform('<p>VT 是 ETF</p>', path)).queryAllByRole('link'), path).toEqual([]);
  }
});

test('[#24-4] 加連結時原本的文字一個字都不能少', async () => {
  // 突變測試發現：測試只檢查連結，「保留前後文字」那段改壞（文字消失）也抓不到
  const html = '<p>VT 是一檔 ETF，VT 的殖利率約 2%，再看一次 ETF。</p><p>沒有名詞的段落。</p>';
  const screen = await transform(html);
  const { document } = new Window();
  document.body.innerHTML = html;
  expect(screen.getByText(/沒有名詞/).closest('body')!.textContent).toBe(document.body.textContent);
});

test('[#24-4] 兩個名詞從同一個字開始時取長的；小標題與程式碼區塊不連', async () => {
  const local = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeGlossaryLinks, {
      terms: [{ term: '高股息', href: '/a' }, { term: '高股息 ETF', href: '/b' }],
      contentDir: './docs',
    })
    .use(rehypeStringify)
    .process(new VFile({ value: '<h3>高股息</h3><pre>高股息</pre><p>高股息 ETF 配息</p>', path: 'docs/knowledge/x.md' }));
  expect(String(local)).toBe('<h3>高股息</h3><pre>高股息</pre><p><a href="/b" class="glossary-link">高股息 ETF</a> 配息</p>');
});

test('[#24-4] 名詞清單只取名詞解釋的 ### 標題（## 資料來源不算、README 不讀），錨點和 Starlight 一樣', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { loadGlossaryTerms } = await import('../../../site/plugins/rehype-glossary-links.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'glossary-'));
  writeFileSync(join(dir, '01-Products.md'), '---\ntitle: x\n---\n\n### ETF\n\n## 資料來源\n\n### 市值型 ETF\n\n### ETF\n');
  writeFileSync(join(dir, 'README.md'), '### 不該出現\n');
  writeFileSync(join(dir, 'notes.txt'), '### 也不該出現\n');
  expect(loadGlossaryTerms(dir, '/investment')).toEqual([
    { term: 'ETF', href: '/investment/glossary/01-products/#etf' },
    { term: '市值型 ETF', href: '/investment/glossary/01-products/#市值型-etf' },
    { term: 'ETF', href: '/investment/glossary/01-products/#etf-1' }, // 同一頁重複的標題，Starlight 會加 -1
  ]);
});

test('[#50-1] 名詞清單讀出「一句話」「新手注意」（去掉 Markdown 的粗體與連結），名詞連結附上對應的小卡', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { loadGlossaryTerms } = await import('../../../site/plugins/rehype-glossary-links.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'glossary-'));
  writeFileSync(join(dir, '01-a.md'), [
    '### ETF', '', '**一句話**：把一籃子股票包成一檔，見[指數](02-b.md#指數)。', '',
    '- **用途**：分散', '- **新手注意**：**類別**不是某一檔。', '', '### 沒有一句話', '', '- **用途**：x',
  ].join('\n'));
  const terms = loadGlossaryTerms(dir, '/investment');
  expect(terms[0]).toEqual({
    term: 'ETF', href: '/investment/glossary/01-a/#etf', oneLine: '把一籃子股票包成一檔，見指數。', note: '類別不是某一檔。',
  });

  const out = String(
    await unified().use(rehypeParse, { fragment: true })
      .use(rehypeGlossaryLinks, { terms, contentDir: './docs' }).use(rehypeStringify)
      .process(new VFile({ value: '<p>ETF 和沒有一句話</p>', path: 'docs/knowledge/x.md' })),
  );
  const { document } = new Window();
  document.body.innerHTML = out;
  const link = document.querySelector('a.glossary-link')!;
  const card = document.getElementById(link.getAttribute('data-card')!)!;
  expect(card.getAttribute('popover')).toBe('auto');
  expect(card.getAttribute('role')).toBe('dialog');
  // 樣式靠這些 class（starlight.css 的 .glossary-card…），改名會讓小卡失去樣式
  expect(card.className).toBe('glossary-card');
  expect([...card.children].map((el) => el.className)).toEqual([
    'glossary-card-close', 'glossary-card-term', 'glossary-card-one', 'glossary-card-note', 'glossary-card-more',
  ]);
  expect(card.querySelector('button')!.textContent).toBe('✕');
  expect(card.querySelector('.glossary-card-term')!.textContent).toBe('ETF');
  expect(card.getAttribute('aria-label')).toBe('名詞：ETF');
  expect(card.textContent).toContain('把一籃子股票包成一檔，見指數。');
  expect(card.textContent).toContain('新手注意：類別不是某一檔。');
  expect(card.querySelector('button')!.getAttribute('popovertarget')).toBe(card.id);
  // 沒有一句話的名詞：只連結、不做小卡
  expect(document.querySelectorAll('[popover]')).toHaveLength(1);
});

test('[#58-2] 手機上會藏起來的表頭（stack-table）不放名詞連結，改連內文第一次出現的地方', async () => {
  const terms = [{ term: 'ETF', href: '/g/#etf' }];
  const out = String(
    await unified().use(rehypeParse, { fragment: true })
      .use(rehypeGlossaryLinks, { terms, contentDir: './docs' }).use(rehypeStringify)
      .process(new VFile({
        value: '<table class="stack-table"><thead><tr><th></th><th>ETF</th></tr></thead><tbody><tr><td>費用</td><td>ETF 很低</td></tr></tbody></table>',
        path: 'docs/knowledge/x.md',
      })),
  );
  const { document } = new Window();
  document.body.innerHTML = out;
  expect(document.querySelector('thead a')).toBeNull();
  expect(document.querySelector('tbody a.glossary-link')?.textContent).toBe('ETF');
});
