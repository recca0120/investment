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
