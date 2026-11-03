// 元件：首頁存摺。資料用手寫的小樣本，預期值可以直接對照
import { within } from '@testing-library/dom';
import { expect, test } from 'vitest';
import Passbook from '../../../site/components/Passbook.astro';
import { render } from '../support/render';

const data = {
  symbol: '0050',
  monthly: 5000,
  start: '2016-01-01',
  end: '2017-01-31',
  months: 13,
  invested: 65000,
  final: 71370,
  annualized: 0.1234, // → 12.3%
  maxDrawdown: 0.0567, // → 5.7%
  rows: [
    { date: '2016-01-04', deposit: 5000, invested: 5000, value: 5000 },
    { date: '2017-01-31', deposit: null, invested: 65000, value: 71370 },
  ],
};

test('[#15-3] 存摺最後一列顯示累計存入與結餘，說明文字有年化報酬與最大跌幅，連結帶有網站 base', async () => {
  const screen = await render(Passbook, { props: { data, base: '/investment/' } });

  const passbook = within(screen.getByRole('figure', { name: /0050 定期定額存摺/ }));
  expect(passbook.getByText('每月 5,000 元，2016 年起')).toBeInTheDocument();

  const last = passbook.getAllByRole('row').at(-1)!;
  const cells = within(last).getAllByRole('cell').map((c) => c.textContent!.trim());
  expect(cells[0]).toBe('2017-01-31');
  expect(cells[2]).toBe('65,000');
  expect(cells[3]).toMatch(/^71,370/);
  expect(within(last).getByLabelText('印章：含息再投入')).toBeInTheDocument();

  expect(passbook.getByText(/共存入 13 個月，年化報酬 12\.3%，期間最大跌幅 5\.7%/)).toBeInTheDocument();
  expect(passbook.getByRole('link', { name: '看完整回測' })).toHaveAttribute(
    'href',
    '/investment/knowledge/07-dca-backtest-2016-2026/',
  );
});
