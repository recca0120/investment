import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { fetchMock } from 'msw-fetch-mock';

// 測試不連網：沒有用 fetchMock 設定的 HTTP 請求一律失敗（相當於 Python 端的 pytest-socket）
beforeAll(() => fetchMock.activate({ onUnhandledRequest: 'error' }));
afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
  fetchMock.reset();
});
afterAll(() => fetchMock.deactivate());
