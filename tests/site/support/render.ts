// 元件測試的入口：Astro 元件在 Node 環境渲染成 HTML，再放進 happy-dom 的 document 給 Testing Library 查詢
// （在 happy-dom 測試環境下直接渲染 .astro 會出現 NoMatchingRenderer，所以分兩步）
// 注意：Vitest 裡 import.meta.env.BASE_URL 固定是 '/'、getCollection() 讀不到資料，
//       所以元件的 base 和資料都要用 props 傳進去
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { within } from '@testing-library/dom';
import { Window } from 'happy-dom';

type RenderOptions = Parameters<AstroContainer['renderToString']>[1];

export async function render(Component: Parameters<AstroContainer['renderToString']>[0], options: RenderOptions = {}) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Component, options);
  const { document } = new Window({ url: 'https://recca0120.github.io/investment/' });
  document.body.innerHTML = html;
  return within(document.body as unknown as HTMLElement);
}
