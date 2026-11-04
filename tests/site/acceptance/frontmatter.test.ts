// 驗收：frontmatter 的「重點」和原稿一字不差（#58）。YAML 會把「 #」後面當註解，例如「（issue #2）」會被截斷
import { globSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { openPage } from '../support/dist';

/** 直接讀原稿的 summary 每一行（不用 YAML 解析，才看得出被截斷） */
function rawSummary(file: string) {
  const front = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const block = front.match(/^summary:\n((?:\s+- .*\n?)+)/m)?.[1] ?? '';
  return block
    .split('\n')
    .filter((l) => l.trim().startsWith('- '))
    .map((l) => l.trim().slice(2).trim())
    // 有引號：取引號裡的字（後面可以接 # 註解）；沒引號：整行都是作者想寫的字，被 YAML 截斷就會和網站不一樣
    .map((v) => v.match(/^(['"])(.*?)\1/)?.[2] ?? v);
}

const FILES = globSync('docs/knowledge/*.{md,mdx}').filter((f) => rawSummary(f).length > 0);

describe('重點', () => {
  test.each(FILES)('[#58-4] %s：網站上的每一點和原稿一樣', (file) => {
    const path = file.replace(/^docs\//, '').replace(/\.mdx?$/, '').toLowerCase() + '/';
    const { document } = openPage(path);
    const shown = [...document.querySelectorAll('[aria-labelledby="page-summary"] li')].map((li) => li.textContent!.trim());
    expect(shown).toEqual(rawSummary(file));
  });
});
