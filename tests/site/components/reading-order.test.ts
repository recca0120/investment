// 元件：首頁的閱讀順序。文章清單用 props 傳入（Vitest 裡 getCollection() 讀不到資料）
import { within } from '@testing-library/dom';
import { expect, test } from 'vitest';
import ReadingOrder from '../../../site/components/ReadingOrder.astro';
import { render } from '../support/render';

// 故意打亂順序，確認元件自己排序
const docs = [
  { id: 'log/2026-11-01-first', title: '第一次討論' },
  { id: 'knowledge/02-methods', title: '方法', description: '幾種常見方法' },
  { id: 'decisions/0001-repo', title: '0001 Repo 結構' },
  { id: 'knowledge/01-start', title: '入門' },
  { id: 'log/2026-11-03-second', title: '第二次討論' },
];

test('[#15-4] 知識文章依檔名排序、討論紀錄新的在前，連結帶有網站 base', async () => {
  const screen = await render(ReadingOrder, { props: { docs, base: '/investment/' } });

  const [knowledge, decisions, logs] = screen.getAllByRole('list').map((l) => within(l).getAllByRole('link'));
  expect(knowledge.map((a) => a.textContent)).toEqual(['入門', '方法']);
  expect(knowledge[0]).toHaveAttribute('href', '/investment/knowledge/01-start/');
  expect(screen.getByText('幾種常見方法')).toBeInTheDocument();

  expect(decisions.map((a) => a.textContent)).toEqual(['0001 Repo 結構']);
  expect(logs.map((a) => a.textContent)).toEqual(['第二次討論', '第一次討論']);
  expect(logs[0]).toHaveAttribute('href', '/investment/log/2026-11-03-second/');
});
