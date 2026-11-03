// 驗收：build 出來的首頁。元件測試用 props 傳資料，這裡確認頁面實際接上真實資料與網站 base
import { within } from '@testing-library/dom';
import { expect, test } from 'vitest';
import passbook from '../../../site/data/passbook.json';
import { openPage } from '../support/dist';

test('首頁的存摺用真實回測結果，閱讀順序的連結帶有網站 base', () => {
  const { screen } = openPage('');

  const figure = within(screen.getByRole('figure', { name: new RegExp(`${passbook.symbol} 定期定額存摺`) }));
  const final = passbook.final.toLocaleString('zh-TW');
  expect(figure.getAllByRole('row').at(-1)).toHaveTextContent(final);
  expect(figure.getByRole('link', { name: '看完整回測' })).toHaveAttribute('href', '/investment/knowledge/07-dca-backtest-2016-2026/');

  const reading = within(screen.getByRole('region', { name: '建議閱讀順序' }));
  expect(reading.getByRole('link', { name: '新手入門路線' })).toHaveAttribute('href', '/investment/knowledge/01-getting-started/');
});
