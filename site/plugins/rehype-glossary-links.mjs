// 知識文章裡的名詞第一次出現時，自動連到名詞解釋（#24）
// - 名詞清單來自 docs/glossary/*.md 的每個 ### 標題，新增名詞不用改程式
// - 同一篇每個名詞只連第一次；長的名詞優先（「市值型 ETF」先於「ETF」）
// - 英文名詞要整個字相符（VTI 裡的 VT 不算）
// - 樣式在 site/styles/starlight.css 的 .glossary-link（文字色＋點狀底線，不像一般連結那麼搶眼）
// - 有「一句話」的名詞另外產生名詞小卡（popover，#50），附在文章最後；點名詞時由 GlossaryCards.astro 打開，沒有 JS 時照常是連結
// - 標題、引言、程式碼、已經是連結的文字不連；手機上會藏起來的表頭（stack-table）也不連；只處理 include 列出的資料夾（預設只有 knowledge）
import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';
import { visitParents, SKIP } from 'unist-util-visit-parents';

// blockquote：每篇開頭的日期與免責說明，不需要名詞連結
const SKIP_TAGS = new Set(['a', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style', 'svg']);

/** 讀名詞解釋：每個 ### 是一個名詞。錨點用和 Starlight 相同的 github-slugger（整頁的 ##、### 依序算，重複時加 -1） */
export function loadGlossaryTerms(glossaryDir, base = '/') {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const plain = (md) => md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').trim();
  return fs
    .readdirSync(glossaryDir)
    .filter((f) => /\.mdx?$/.test(f) && f !== 'README.md')
    .sort()
    .flatMap((f) => {
      const page = f.replace(/\.mdx?$/, '').toLowerCase();
      const slugger = new GithubSlugger();
      const lines = fs.readFileSync(path.join(glossaryDir, f), 'utf8').split('\n');
      const terms = [];
      for (const line of lines) {
        const h = line.match(/^(#{2,3})\s+(.+?)\s*$/);
        if (h) {
          const id = slugger.slug(h[2]);
          terms.push(h[1] === '###' ? { term: h[2], href: `${prefix}glossary/${page}/#${id}` } : null);
          continue;
        }
        const current = terms.at(-1);
        if (!current) continue;
        const one = line.match(/^\*\*一句話\*\*：(.+)$/);
        const note = line.match(/^- \*\*新手注意\*\*：(.+)$/);
        if (one) current.oneLine = plain(one[1]);
        if (note) current.note = plain(note[1]);
      }
      return terms.filter(Boolean);
    });
}

/** 名詞小卡（popover）：一句話、新手注意、看完整解釋。點名詞時由 GlossaryCards.astro 的 script 打開 */
function card(id, t) {
  const el = (tagName, className, children, properties = {}) => ({
    type: 'element', tagName, properties: { className, ...properties }, children,
  });
  const text = (value) => ({ type: 'text', value });
  return el('div', ['glossary-card'], [
    el('button', ['glossary-card-close'], [text('✕')], { type: 'button', popovertarget: id, popovertargetaction: 'hide', ariaLabel: '關閉' }),
    el('p', ['glossary-card-term'], [text(t.term)]),
    t.oneLine && el('p', ['glossary-card-one'], [text(t.oneLine)]),
    t.note && el('p', ['glossary-card-note'], [el('strong', [], [text('新手注意：')]), text(t.note)]),
    el('a', ['glossary-card-more'], [text('看完整解釋')], { href: t.href }),
  ].filter(Boolean), { id, popover: 'auto', role: 'dialog', ariaLabel: `名詞：${t.term}` });
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = (term) => {
  const body = escape(term).replace(/\s+/g, '\\s*');
  return /^[A-Za-z0-9]/.test(term) ? `(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])` : body;
};

/**
 * @param {{ terms?: {term: string, href: string}[], glossaryDir?: string, base?: string,
 *           contentDir: string, include?: string[] }} opts
 */
export default function rehypeGlossaryLinks({ terms, glossaryDir, base, contentDir, include = ['knowledge'] }) {
  const all = [...(terms ?? loadGlossaryTerms(glossaryDir, base))].sort((a, b) => b.term.length - a.term.length);
  const dirs = include.map((d) => path.resolve(contentDir, d) + path.sep);

  return (tree, file) => {
    const from = path.resolve(file.path ?? file.history?.[0] ?? '');
    if (!dirs.some((d) => from.startsWith(d))) return;

    const used = new Set();
    const cards = [];
    visitParents(tree, 'text', (node, ancestors) => {
      if (ancestors.some((a) => a.type === 'element' && SKIP_TAGS.has(a.tagName))) return;
      // 手機上依列排的表格，表頭會藏起來（每格前面已經有欄名）：名詞不能第一次出現在這裡，否則手機上點不到（#58）
      if (ancestors.some((a, i) => a.tagName === 'thead' && ancestors[i - 1]?.properties?.className?.includes?.('stack-table'))) return;
      const remaining = all.filter((t) => !used.has(t.term));
      if (remaining.length === 0) return;
      const re = new RegExp(remaining.map((t) => `(${pattern(t.term)})`).join('|'), 'u');

      const parts = [];
      let plain = ''; // 還沒放進 parts 的一般文字（包含同一段裡重複出現、已經連過的名詞）
      let rest = node.value;
      for (let m = rest.match(re); m; m = rest.match(re)) {
        const hit = remaining[m.slice(1).findIndex(Boolean)];
        plain += rest.slice(0, m.index);
        rest = rest.slice(m.index + m[0].length);
        if (used.has(hit.term)) {
          plain += m[0];
          continue;
        }
        used.add(hit.term);
        const cardId = hit.oneLine ? `glossary-card-${cards.length}` : undefined;
        if (cardId) cards.push(card(cardId, hit));
        if (plain) parts.push({ type: 'text', value: plain });
        plain = '';
        parts.push({
          type: 'element',
          tagName: 'a',
          properties: { href: hit.href, className: ['glossary-link'], ...(cardId && { dataCard: cardId }) },
          children: [{ type: 'text', value: m[0] }],
        });
      }
      if (parts.length === 0) return;
      if (plain + rest) parts.push({ type: 'text', value: plain + rest });

      const parent = ancestors[ancestors.length - 1];
      const index = parent.children.indexOf(node);
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length];
    });
    tree.children.push(...cards);
  };
}
