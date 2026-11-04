// 驗收：名詞 skill 的檢查工具（#62）。寫文章前列出名詞、寫完後一次核對，不用手動一個一個查
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const SCRIPT = '.claude/skills/glossary/scripts/terms.mjs';

/** 小型名詞解釋＋別名表＋文章，和真的檔案格式一樣 */
function fixture(article: string) {
  const dir = mkdtempSync(join(tmpdir(), 'terms-'));
  const glossary = join(dir, 'glossary');
  mkdirSync(glossary);
  writeFileSync(join(glossary, '01-products.md'), [
    '---', 'title: 商品', '---', '', '### ETF', '', '**一句話**：把一籃子股票包成一檔。', '',
    '- **用途**：分散', '- **例子**：0050', '- **新手注意**：看追蹤什麼。', '',
    '### 指數', '', '**一句話**：一籃子股票的分數。', '', '- **用途**：衡量', '- **例子**：台灣 50', '- **新手注意**：不能直接買。',
  ].join('\n'));
  writeFileSync(join(glossary, '02-strategies.md'), [
    '---', 'title: 策略', '---', '', '### 股債比', '', '**一句話**：股票和債券各占多少。', '',
    '- **用途**：調整風險', '- **例子**：80/20', '- **新手注意**：要撐得住。',
  ].join('\n'));
  const aliases = join(dir, 'aliases.json');
  writeFileSync(aliases, JSON.stringify({ 股債比: ['股債配置', '股債分配'] }));
  const file = join(dir, 'knowledge', '02-a.md');
  mkdirSync(join(dir, 'knowledge'));
  writeFileSync(file, article);
  return { glossary, aliases, file, args: ['--glossary', glossary, '--aliases', aliases] };
}

const run = (args: string[]) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

describe('terms.mjs', () => {
  test('[#62-1] list：依分類列出每一個名詞和它的「一句話」', () => {
    const { args } = fixture('');
    const out = execFileSync('node', [SCRIPT, 'list', ...args], { encoding: 'utf8' });
    expect(out).toMatch(/商品[\s\S]*ETF：把一籃子股票包成一檔。[\s\S]*指數：一籃子股票的分數。[\s\S]*策略[\s\S]*股債比：股票和債券各占多少。/);
  });

  test('[#62-2] check：列出會連成小卡的名詞、別名、可能要補的新名詞、只出現在標題的名詞、沒資訊的標題', () => {
    const { args, file } = fixture([
      '---', 'title: 測試', 'summary:', '  - 重點', '---', '',
      '## 指數介紹', '', '| 方法 | 內容 |', '|---|---|', '| 「三基金組合」 | 用 **VTI** 加 ETF |', '',
      '先決定股債配置，再買 ETF。', '', '## 注意', '', '- 看清楚', '',
      '## 資料來源', '', '- [x](https://a.example)',
    ].join('\n'));
    const r = run(['check', file, '--json', ...args]);
    const [report] = JSON.parse(r.stdout);
    // 和網站一致：第一次出現（表格裡）才連結；標題裡的「指數」不算
    expect(report.linked.map((l: { term: string }) => l.term)).toEqual(['ETF']);
    expect(report.aliases).toEqual([expect.objectContaining({ found: '股債配置', use: '股債比' })]);
    expect(report.candidates.map((c: { text: string }) => c.text)).toEqual(expect.arrayContaining(['三基金組合', 'VTI']));
    expect(report.unlinked).toEqual([expect.objectContaining({ term: '指數' })]);
    expect(report.headings.map((h: { text: string }) => h.text)).toEqual(['指數介紹', '注意']);
    expect(r.status, '有別名或沒資訊的標題要失敗').not.toBe(0);
  });

  test('[#62-2] check：沒問題的文章結束碼是 0，報告看得懂', () => {
    const { args, file } = fixture(['---', 'title: 好文章', '---', '', '## 結論：ETF 適合新手', '', '先決定股債比，再買 ETF。'].join('\n'));
    const r = run(['check', file, ...args]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toContain('會連成小卡（2）：股債比、ETF');
  });

  test('[#62-3] check --all：所有知識文章都沒有別名、沒有沒資訊的標題', () => {
    const r = run(['check', '--all']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
});

test('[#62-4] 文章 02：「三基金組合」「股債比」都有名詞小卡，標題寫出結論', async () => {
  const { openPage } = await import('../support/dist');
  const { document } = openPage('knowledge/02-recommended-methods/');
  const cards = [...document.querySelectorAll<HTMLAnchorElement>('.sl-markdown-content a.glossary-link[data-card]')].map((a) =>
    a.textContent!.trim(),
  );
  expect(cards).toEqual(expect.arrayContaining(['三基金組合', '股債比']));
  const headings = [...document.querySelectorAll('.sl-markdown-content h2')].map((h) => h.textContent!.trim());
  expect(headings.length).toBeGreaterThanOrEqual(3);
  for (const h of headings) expect(h, '標題要寫出結論（含「：」後面的說明）').toMatch(/：.+/);
});
