// 突變測試（Stryker）用的 Vitest 設定：只跑不需要 build 的 node 測試（#atdd mutation-testing）
// 讀 dist/ 的驗收測試和瀏覽器測試不在這裡：Stryker 改了程式不會重新 build，會得到假的「漏網」
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/site/lib/**/*.test.ts', 'tests/site/plugins/**/*.test.ts', 'tests/site/design/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/site/support/setup.ts'],
  },
});
