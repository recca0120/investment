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
