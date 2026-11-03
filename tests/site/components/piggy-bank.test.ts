// 元件：首頁撲滿。資料用手寫的小樣本，預期值可以直接對照
import { within } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import PiggyBank from '../../../site/components/PiggyBank.astro';
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

async function renderPiggy() {
  const screen = await render(PiggyBank, { props: { data, base: '/investment/' } });
  return within(screen.getByRole('figure', { name: /0050 定期定額撲滿/ }));
}

describe('首頁撲滿', () => {
  test('[#19-1] 用文字顯示每月金額、存入月數、累計存入與目前市值', async () => {
    const piggy = await renderPiggy();
    expect(piggy.getByRole('img', { name: /撲滿/ })).toBeInTheDocument();
    // 13 個月 × 5,000 = 65,000；市值取最後一列
    const summary = piggy.getByText(/每月丟/).closest('p')!;
    expect(summary).toHaveTextContent('每月丟 5,000 元進撲滿，存了 13 個月，放進 65,000 元，現在變成 71,370 元');
  });

  test('[#19-2] 每年的存入紀錄：最後一列顯示累計存入與結餘', async () => {
    const piggy = await renderPiggy();
    expect(piggy.getByText('看每一年的存入紀錄')).toBeInTheDocument();
    const last = piggy.getAllByRole('row').at(-1)!;
    const cells = within(last).getAllByRole('cell').map((c) => c.textContent!.trim());
    expect(cells[0]).toBe('2017-01-31');
    expect(cells[2]).toBe('65,000');
    expect(cells[3]).toMatch(/^71,370/);
    expect(within(last).getByLabelText('金幣：含息再投入')).toBeInTheDocument();
  });

  test('[#15-3] 說明文字有年化報酬與最大跌幅，「看完整回測」連結帶有網站 base', async () => {
    const piggy = await renderPiggy();
    expect(piggy.getByText(/年化報酬 12\.3%，期間最大跌幅 5\.7%/)).toBeInTheDocument();
    expect(piggy.getByRole('link', { name: '看完整回測' })).toHaveAttribute(
      'href',
      '/investment/knowledge/07-dca-backtest-2016-2026/',
    );
  });
});
