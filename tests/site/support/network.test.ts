// 測試環境本身：網站測試不連網（setup.ts 用 msw-fetch-mock 攔截所有 fetch）
import { fetchMock } from 'msw-fetch-mock';
import { expect, test } from 'vitest';

test('[#15-8] 沒有設定的 HTTP 請求一律失敗', async () => {
  await expect(fetch('https://recca0120.github.io/investment/')).rejects.toThrow();
});

test('有設定的請求回傳假資料（之後瀏覽器端抓資料的程式這樣測）', async () => {
  fetchMock
    .get('https://recca0120.github.io')
    .intercept({ path: '/investment/data/0050.json' })
    .reply(200, { final: 3074574 });

  const res = await fetch('https://recca0120.github.io/investment/data/0050.json');
  await expect(res.json()).resolves.toEqual({ final: 3074574 });
});
