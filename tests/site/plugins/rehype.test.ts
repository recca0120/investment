// rehype 外掛：Markdown 轉成 HTML 時的改寫規則。直接用 unified 跑外掛，不需要 build
import { expect, test } from 'vitest';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { VFile } from 'vfile';
import { within } from '@testing-library/dom';
import { Window } from 'happy-dom';
import rehypeMdLinks from '../../../site/plugins/rehype-md-links.mjs';
import rehypeNumCells from '../../../site/plugins/rehype-num-cells.mjs';
import rehypeCompareTables from '../../../site/plugins/rehype-compare-tables.mjs';

async function transform(html: string, plugin: any, options?: unknown, path = 'docs/knowledge/01-a.md') {
  const file = new VFile({ value: html, path });
  const out = String(await unified().use(rehypeParse, { fragment: true }).use(plugin, options).use(rehypeStringify).process(file));
  const { document } = new Window();
  document.body.innerHTML = out;
  return within(document.body as unknown as HTMLElement);
}

test('[#15-5] 整欄都是數字的欄位才靠右；代號欄混有 0050 和 VT 時不動', async () => {
  const screen = await transform(
    `<table>
      <tr><th>代號</th><th>市值</th><th>報酬</th><th>費用</th></tr>
      <tr><td>0050</td><td>3,074,574</td><td>+26.7%</td><td>—</td></tr>
      <tr><td>VT</td><td>1,331,749</td><td>-3.5%</td><td>0.06%</td></tr>
    </table>`,
    rehypeNumCells,
  );
  const [code, value, ret, fee] = screen.getAllByRole('columnheader');
  expect(code).not.toHaveClass('num');
  expect(value).toHaveClass('num');
  expect(ret).toHaveClass('num');
  expect(fee).toHaveClass('num'); // — 視為空值，不影響判斷
  expect(screen.getByRole('cell', { name: '0050' })).not.toHaveClass('num');
  expect(screen.getByRole('cell', { name: '3,074,574' })).toHaveClass('num');
});

test('[#15-6] 連到其他 .md 的相對連結轉成網站路由（含 base 與錨點）', async () => {
  const screen = await transform(
    `<a href="./02-b.md">同資料夾</a>
     <a href="../decisions/0003-data-source.md#理由">其他資料夾加錨點</a>
     <a href="https://example.com/x.md">外部網址</a>
     <a href="#段落">頁內錨點</a>
     <a href="../../README.md">docs 外面</a>`,
    rehypeMdLinks,
    { contentDir: './docs', base: '/investment' },
  );
  const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href');
  expect(href('同資料夾')).toBe('/investment/knowledge/02-b/');
  expect(href('其他資料夾加錨點')).toBe('/investment/decisions/0003-data-source/#理由');
  expect(href('外部網址')).toBe('https://example.com/x.md');
  expect(href('頁內錨點')).toBe('#段落');
  expect(href('docs 外面')).toBe('../../README.md');
});

test('[#22-14] 「資料來源」段落收成 details，摘要標示筆數；後面的段落不受影響', async () => {
  const { default: rehypeCollapseSources } = await import('../../../site/plugins/rehype-collapse-sources.mjs');
  const screen = await transform(
    `<h2>結論</h2><p>內文</p>
     <h2>資料來源</h2><ul><li><a href="https://a.example">A</a></li><li><a href="https://b.example">B</a></li></ul>
     <h2>之後的段落</h2><p>還在</p>`,
    rehypeCollapseSources,
  );
  const details = screen.getByRole('group');
  expect(details.tagName).toBe('DETAILS');
  expect(details).not.toHaveAttribute('open');
  expect(details.querySelector('summary')!.textContent).toBe('資料來源（2 筆）');
  expect(details.querySelectorAll('a')).toHaveLength(2);
  expect(screen.queryByRole('heading', { name: '資料來源' })).toBeNull();
  expect(screen.getByRole('heading', { name: '之後的段落' }).closest('details')).toBeNull();
});

// 突變測試發現的邊界情況
test('[#22-14] 資料來源在文章最後（最常見）也會收合；相對連結與錨點不算筆數；沒有資料來源的文章不動', async () => {
  const { default: rehypeCollapseSources } = await import('../../../site/plugins/rehype-collapse-sources.mjs');
  const last = await transform(
    `<p>內文</p><h2>資料來源</h2><ul><li><a href="https://a.example">A</a></li><li><a href="../x.md">站內</a></li><li><a href="#top">錨點</a></li></ul>`,
    rehypeCollapseSources,
  );
  const details = last.getByRole('group');
  expect(details.querySelector('summary')!.textContent).toBe('資料來源（1 筆）');
  expect(details.querySelectorAll('a')).toHaveLength(3);
  expect(details).toHaveClass('sources');

  const none = await transform('<h2>結論</h2><p>沒有資料來源</p>', rehypeCollapseSources);
  expect(none.queryByRole('group')).toBeNull();
  expect(none.getByRole('heading', { name: '結論' })).toBeInTheDocument();
});

test('[#15-6] docs 以外的檔案不改；連到 index.md 變成資料夾路由', async () => {
  const outside = await transform('<a href="./a.md">外面</a>', rehypeMdLinks, { contentDir: './docs', base: '/investment' }, 'README.md');
  expect(outside.getByRole('link', { name: '外面' })).toHaveAttribute('href', './a.md');
  const index = await transform('<a href="../index.md">首頁</a><a href="./sub/index.md">子目錄</a>', rehypeMdLinks, { contentDir: './docs', base: '/investment' });
  expect(index.getByRole('link', { name: '首頁' })).toHaveAttribute('href', '/investment/');
  expect(index.getByRole('link', { name: '子目錄' })).toHaveAttribute('href', '/investment/knowledge/sub/');
});

test('[#15-5] 混了文字的欄位（約 0.08%～0.25%）不算數字欄；只有表頭的表格不動', async () => {
  const screen = await transform(
    `<table><tr><th>管道</th><th>手續費</th><th>報酬</th></tr>
      <tr><td>複委託</td><td>約 0.08%～0.25%</td><td>12.6%</td></tr>
      <tr><td>海外券商</td><td>0 元</td><td>13.0%</td></tr></table>
     <table><tr><th>只有</th><th>表頭</th></tr></table>`,
    rehypeNumCells,
  );
  expect(screen.getByRole('columnheader', { name: '手續費' })).not.toHaveClass('num');
  expect(screen.getByRole('columnheader', { name: '報酬' })).toHaveClass('num');
  expect(screen.getByRole('columnheader', { name: '只有' })).not.toHaveClass('num');
});

test('[#54-2] 比較表（第一格表頭是空的）每一格記下欄名，給手機版顯示；一般表格不動', async () => {
  const screen = await transform(
    `<table><thead><tr><th></th><th>複委託</th><th><a href="#x">海外</a>券商</th></tr></thead>
      <tbody><tr><td>手續費</td><td>0.1%</td><td>0 元</td></tr></tbody></table>
     <table><thead><tr><th>代號</th><th>市值</th></tr></thead><tbody><tr><td>0050</td><td>1</td></tr></tbody></table>`,
    rehypeCompareTables,
  );
  const [compare, plain] = screen.getAllByRole('table');
  expect(compare.className, '原本沒有 class 時只加 compare-table').toBe('compare-table');
  const cells = within(compare).getAllByRole('cell');
  expect(cells.map((c) => c.getAttribute('data-label'))).toEqual([null, '複委託', '海外券商']);
  expect(plain).not.toHaveClass('compare-table');
  expect(within(plain).getAllByRole('cell').every((c) => !c.hasAttribute('data-label'))).toBe(true);
});

test('[#54-2] Markdown 產生的表格（格子之間有換行）、表頭換行、已有 class、只有表頭的表都處理正確', async () => {
  const screen = await transform(
    `<table class="wide">
      <thead>
        <tr>
          <th></th>
          <th> FinMind（不帶
            token） </th>
          <th>yfinance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>美股</td>
          <td>有</td>
          <td>有</td>
        </tr>
      </tbody>
    </table>
    <table><thead><tr><th></th><th>只有表頭</th></tr></thead></table>`,
    rehypeCompareTables,
  );
  const [compare, headOnly] = screen.getAllByRole('table');
  expect(compare).toHaveClass('wide');
  expect(compare).toHaveClass('compare-table');
  expect(within(compare).getAllByRole('cell').map((c) => c.getAttribute('data-label'))).toEqual([
    null,
    'FinMind（不帶 token）',
    'yfinance',
  ]);
  expect(headOnly).not.toHaveClass('compare-table');
});
