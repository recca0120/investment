// 驗收：名詞小卡（#50）。讀 dist：每個名詞連結都有對應的小卡，內容和名詞解釋頁一致；沒有 JS 時照常是連結
import { readFileSync, readdirSync } from 'node:fs';
import { within } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { existsInDist, openPage } from '../support/dist';

/** 直接從名詞解釋原稿讀「一句話」與「新手注意」（不用外掛的程式，避免測試和實作用同一套解析） */
function glossary() {
  const plain = (md: string) => md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').trim();
  const entries = new Map<string, { oneLine: string; note?: string }>();
  for (const f of readdirSync('docs/glossary').filter((f) => /^\d\d-.+\.md$/.test(f))) {
    for (const chunk of readFileSync(`docs/glossary/${f}`, 'utf8').split(/^### /m).slice(1)) {
      const term = chunk.split('\n')[0].trim();
      const oneLine = chunk.match(/^\*\*一句話\*\*：(.+)$/m)?.[1];
      const note = chunk.match(/^- \*\*新手注意\*\*：(.+)$/m)?.[1];
      if (oneLine && !entries.has(term)) entries.set(term, { oneLine: plain(oneLine), note: note && plain(note) });
    }
  }
  return entries;
}

const PAGES = ['knowledge/03-products-comparison/', 'knowledge/07-dca-backtest-2016-2026/', 'knowledge/08-us-stock-tax/'];

describe('名詞小卡', () => {
  const entries = glossary();

  test.each(PAGES)('[#50-1] %s：每個名詞連結都有小卡，內容和名詞解釋頁一致', (path) => {
    const { document } = openPage(path);
    const links = [...document.querySelectorAll<HTMLAnchorElement>('.sl-markdown-content a.glossary-link')];
    expect(links.length, '這篇應該有名詞連結').toBeGreaterThan(3);

    for (const link of links) {
      const term = link.textContent!.replace(/\s+/g, ' ').trim();
      const card = document.getElementById(link.dataset.card ?? '');
      expect(card, `「${term}」沒有小卡`).not.toBeNull();
      expect(card!.hasAttribute('popover'), `「${term}」的小卡要是 popover`).toBe(true);

      const box = within(card as HTMLElement);
      expect(card!.getAttribute('aria-label')).toMatch(/^名詞：/);
      const name = card!.getAttribute('aria-label')!.replace(/^名詞：/, '');
      const entry = entries.get(name);
      expect(entry, `名詞解釋裡找不到「${name}」`).toBeDefined();
      expect(card!.textContent).toContain(entry!.oneLine);
      if (entry!.note) expect(card!.textContent).toContain(entry!.note);
      expect(box.getByRole('link', { name: '看完整解釋' })).toHaveAttribute('href', link.getAttribute('href')!);
      expect(box.getByRole('button', { name: '關閉' })).toHaveAttribute('popovertarget', card!.id);
    }
  });

  test.each(PAGES)('[#50-2] %s：沒有 JavaScript 時名詞照常是連到名詞解釋的連結', (path) => {
    const { document } = openPage(path);
    for (const link of document.querySelectorAll<HTMLAnchorElement>('.sl-markdown-content a.glossary-link')) {
      const href = link.getAttribute('href')!;
      expect(link.tagName).toBe('A');
      expect(href, link.textContent!).toMatch(/^\/investment\/glossary\/[^#]+\/#.+/);
      expect(existsInDist(href), href).toBe(true);
    }
  });
});
