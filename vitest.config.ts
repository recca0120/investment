/// <reference types="vitest/config" />
// 網站測試設定（Python 系統的測試在 pyproject.toml）
// - node：驗收（讀 dist/ HTML）、元件（Astro Container API）、rehype 外掛
// - browser：真實瀏覽器裡檢查版面（手機寬度不能水平捲動）
import { getViteConfig } from 'astro/config';
import { playwright } from '@vitest/browser-playwright';
import { serveDist } from './tests/site/support/serve-dist.ts';

export default getViteConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/site/**/*.test.ts'],
          exclude: ['tests/site/browser/**'],
          setupFiles: ['tests/site/support/setup.ts'],
        },
      },
      {
        plugins: [serveDist()],
        test: {
          name: 'browser',
          include: ['tests/site/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            // 用本機（或 CI runner 上）已安裝的 Chrome，不另外下載瀏覽器
            provider: playwright({ launchOptions: { channel: 'chrome' } }),
            instances: [{ browser: 'chromium' }],
            commands: {
              // 模擬作業系統的「減少動態效果」，iframe 裡的頁面也會套用
              setReducedMotion: async (ctx, reduce: boolean) => {
                await ctx.page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
              },
              // 真的鍵盤與滑鼠事件（popover 的 Esc 關閉、點外面關閉只對真實操作有反應，程式模擬的事件不算）
              // 座標是整個測試頁面的座標：iframe 裡的元素要加上 iframe 的位置
              pressKey: async (ctx, key: string) => {
                await ctx.page.keyboard.press(key);
              },
              mouseClick: async (ctx, x: number, y: number) => {
                await ctx.page.mouse.click(x, y);
              },
            },
          },
        },
      },
    ],
  },
});
