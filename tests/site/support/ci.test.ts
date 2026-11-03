// CI 設定：網站測試在部署前執行，失敗就不會部署
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const workflow = readFileSync('.github/workflows/site.yml', 'utf8');

test('[#15-9] PR 和 push 到 main 都會在 build 之後、上傳部署檔之前執行網站測試', () => {
  expect(workflow).toMatch(/^\s+pull_request:/m);
  expect(workflow).toMatch(/push:\s+branches: \[main\]/);
  // 測試相關檔案變動也要觸發
  expect(workflow).toContain("- 'tests/site/**'");
  expect(workflow).toContain("- 'vitest.config.ts'");

  const build = workflow.indexOf('run: npm run build');
  const tests = workflow.indexOf('run: npm test');
  const upload = workflow.indexOf('actions/upload-pages-artifact');
  expect(build).toBeGreaterThan(-1);
  expect(tests).toBeGreaterThan(build);
  expect(upload).toBeGreaterThan(tests);
  // 部署 job 依賴 build job（測試失敗 → build job 失敗 → 不部署）
  expect(workflow).toMatch(/deploy:[\s\S]*needs: build/);
});
