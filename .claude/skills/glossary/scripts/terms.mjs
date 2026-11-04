#!/usr/bin/env node
// 名詞檢查工具（#62）：寫文章前列出所有名詞，寫完後一次核對，不用手動一個一個查
//
//   node .claude/skills/glossary/scripts/terms.mjs list                 # 依分類列出名詞和「一句話」
//   node .claude/skills/glossary/scripts/terms.mjs check docs/knowledge/02-recommended-methods.md
//   node .claude/skills/glossary/scripts/terms.mjs check --all          # 全部知識文章（CI 用）
//   選項：--json（給程式讀）、--glossary <資料夾>、--aliases <json>（測試用，預設是 docs/glossary）
//
// 「會連成小卡」用網站真正的 Markdown 外掛算（site/plugins/markdown.mjs），和網站上看到的一致。
// 結束碼：用了別名或有沒資訊的標題 → 1（CI 會擋）；可能要補的新名詞只是提醒，不影響結束碼。
import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import { loadGlossaryTerms } from '../../../../site/plugins/rehype-glossary-links.mjs';
import { rehypePlugins } from '../../../../site/plugins/markdown.mjs';

const BASE = '/investment';
// 沒資訊的標題：只看標題得不到任何結論（決策 0006：標題寫結論）
const EMPTY_HEADINGS = new Set(['說明', '介紹', '簡介', '注意', '注意事項', '補充', '其他', '備註', '共同點', '結論', '總結', '概述', '重點']);
const isEmptyHeading = (text) => EMPTY_HEADINGS.has(text) || /(介紹|說明|簡介)$/.test(text);

function parseArgs(argv) {
  const opts = { cmd: argv[0], files: [], json: false, all: false, glossary: 'docs/glossary', aliases: 'docs/glossary/aliases.json' };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--glossary') opts.glossary = argv[++i];
    else if (a === '--aliases') opts.aliases = argv[++i];
    else opts.files.push(a);
  }
  return opts;
}

/** 名詞解釋：每個分類（檔案）的標題和名詞 */
function loadCategories(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d\d-.+\.mdx?$/.test(f))
    .sort()
    .map((f) => {
      const source = fs.readFileSync(path.join(dir, f), 'utf8');
      const title = source.match(/^title:\s*(.+)$/m)?.[1].trim() ?? f;
      return { file: f, title };
    });
}

function loadAliases(file) {
  if (!fs.existsSync(file)) return { aliases: {}, ignore: [] };
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { $ignore = [], ...aliases } = data;
  return { aliases, ignore: $ignore };
}

function list(opts) {
  const terms = loadGlossaryTerms(opts.glossary, BASE);
  const categories = loadCategories(opts.glossary);
  if (opts.json) return console.log(JSON.stringify(terms, null, 2));
  for (const c of categories) {
    const page = c.file.replace(/\.mdx?$/, '').toLowerCase();
    console.log(`## ${c.title}`);
    for (const t of terms.filter((t) => t.href.includes(`/glossary/${page}/`))) console.log(`- ${t.term}：${t.oneLine ?? '（沒有一句話）'}`);
    console.log('');
  }
}

/** 去掉 frontmatter；MDX 的 import 和元件標籤行去掉，保留裡面的內容。行號不變（換成空行） */
function body(source) {
  const lines = source.split('\n');
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    for (let i = 0; i <= end; i++) lines[i] = '';
  }
  return lines.map((l) => (/^\s*(import\s.+from\s|<\/?[A-Z][\w.]*[\s>/])/.test(l) ? '' : l)).join('\n');
}

/** 不算正文的行：程式碼區塊、引言、資料來源之後 */
function proseLines(text) {
  const lines = text.split('\n');
  let code = false;
  let sources = false;
  return lines.map((line, i) => {
    if (/^\s*```/.test(line)) {
      code = !code;
      return { line: i + 1, text: '' };
    }
    if (/^##\s+資料來源\s*$/.test(line)) sources = true;
    else if (/^##\s/.test(line)) sources = false;
    const skip = code || sources || /^\s*>/.test(line);
    return { line: i + 1, text: skip ? '' : line };
  });
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRe = (term) => {
  const body = escape(term).replace(/\s+/g, '\\s*');
  return new RegExp(/^[A-Za-z0-9]/.test(term) ? `(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])` : body, 'u');
};

async function check(file, opts, terms, { aliases, ignore }) {
  const source = fs.readFileSync(file, 'utf8');
  const text = body(source);
  const abs = path.resolve(file);
  // 網站的名詞連結只處理 <contentDir>/knowledge 底下的文章
  const contentDir = path.basename(path.dirname(abs)) === 'knowledge' ? path.dirname(path.dirname(abs)) : path.resolve('docs');
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypePlugins({ base: BASE, contentDir, glossaryDir: opts.glossary }));
  const tree = await processor.run(processor.parse(text), new VFile({ path: abs, value: text }));

  const byHref = new Map(terms.map((t) => [t.href, t.term]));
  const linked = [];
  visit(tree, 'element', (node) => {
    if (node.tagName === 'a' && [node.properties.className ?? []].flat().includes('glossary-link'))
      linked.push({ term: byHref.get(node.properties.href) ?? '', withCard: Boolean(node.properties.dataCard) });
  });
  const linkedSet = new Set(linked.map((l) => l.term));

  const lines = text.split('\n');
  const prose = proseLines(text);
  const glossaryNames = new Set(terms.map((t) => t.term));
  const aliasNames = new Set(Object.values(aliases).flat());

  // 用了別名：應該改用名詞解釋裡的正式名稱（新手看到兩種說法會以為是兩件事）
  const aliasHits = [];
  for (const [use, list] of Object.entries(aliases))
    for (const found of list)
      for (const { line, text: l } of prose) if (l && termRe(found).test(l)) aliasHits.push({ found, use, line });

  // 可能要補的新名詞：「」引起來的詞、粗體短詞、代號（英文縮寫、00 開頭的台股代號），名詞解釋裡沒有的
  const candidates = [];
  const seen = new Set();
  const add = (word, line) => {
    const w = word.trim();
    if (!w || seen.has(w) || glossaryNames.has(w) || aliasNames.has(w) || ignore.includes(w)) return;
    seen.add(w);
    candidates.push({ text: w, line });
  };
  for (const { line, text: l } of prose) {
    if (!l || /^#{1,6}\s/.test(l)) continue;
    // 「」和粗體只收短的名詞（2～6 個字、沒有數字和標點）；粗體的句子是強調，不是名詞
    for (const m of l.matchAll(/「([^「」，。；：、／\s\d]{2,6})」/g)) add(m[1], line);
    // 「**資格**：…」這種清單開頭的粗體是小標籤，不算
    for (const m of l.matchAll(/\*\*([^*，。；：:、／\s\d]{2,6})\*\*(?![：:])/g)) add(m[1], line);
    // 代號：英文縮寫、台股代號（00 後面接非 0 的數字；0007 這種是決策編號）
    for (const m of l.matchAll(/(?<![A-Za-z0-9_./-])([A-Z]{2,5}|00[1-9]\d{1,3}[A-Z]?)(?![A-Za-z0-9_/-])/g)) add(m[1], line);
  }

  // 名詞讀者看得到、卻不會有小卡：只出現在標題、引言、連結文字裡（資料來源和程式碼不算，讀者不會在那裡找）。
  // 比它長的名詞（「交割」在「交割戶」裡）先遮掉，網站也是優先連長的
  const visible = lines.map((l, i) => {
    let code = false;
    for (let j = 0; j <= i; j++) if (/^\s*```/.test(lines[j])) code = !code;
    const sourcesStart = lines.findIndex((x) => /^##\s+資料來源\s*$/.test(x));
    return code || (sourcesStart !== -1 && i >= sourcesStart) ? '' : l;
  });
  const unlinked = [];
  for (const t of terms) {
    if (linkedSet.has(t.term)) continue;
    const longer = terms.filter((o) => o.term !== t.term && o.term.includes(t.term));
    const where = visible.findIndex((l) => termRe(t.term).test(longer.reduce((x, o) => x.replace(termRe(o.term), ''), l)));
    if (where === -1) continue;
    const l = visible[where];
    const kind = /^#{1,6}\s/.test(l) ? '標題' : /^\s*>/.test(l) ? '引言' : '連結文字或表頭';
    unlinked.push({ term: t.term, line: where + 1, where: kind });
  }

  const headings = [];
  lines.forEach((l, i) => {
    const m = l.match(/^#{2,3}\s+(.+?)\s*$/);
    if (m && m[1] !== '資料來源' && isEmptyHeading(m[1])) headings.push({ text: m[1], line: i + 1 });
  });

  return { file, linked, aliases: aliasHits, candidates, unlinked, headings };
}

function print(r) {
  console.log(r.file);
  console.log(`  會連成小卡（${r.linked.length}）：${r.linked.map((l) => l.term).join('、') || '（沒有）'}`);
  for (const a of r.aliases) console.log(`  ✗ 用了別名「${a.found}」→ 請用名詞解釋的「${a.use}」（第 ${a.line} 行）`);
  for (const h of r.headings) console.log(`  ✗ 沒資訊的標題「${h.text}」→ 改成寫出結論（第 ${h.line} 行）`);
  if (r.candidates.length)
    console.log(`  ? 可能要補進名詞解釋：${r.candidates.map((c) => `${c.text}（第 ${c.line} 行）`).join('、')}`);
  if (r.unlinked.length)
    console.log(`  ? 讀者看得到但不會有小卡：${r.unlinked.map((u) => `${u.term}（第 ${u.line} 行${u.where}）`).join('、')}`);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.cmd === 'list') list(opts);
else if (opts.cmd === 'check') {
  const files = opts.all
    ? fs.readdirSync('docs/knowledge').filter((f) => /^\d\d-.+\.mdx?$/.test(f)).sort().map((f) => path.join('docs/knowledge', f))
    : opts.files;
  if (files.length === 0) {
    console.error('請給文章路徑，或用 --all');
    process.exit(2);
  }
  const terms = loadGlossaryTerms(opts.glossary, BASE);
  const aliasData = loadAliases(opts.aliases);
  const reports = [];
  for (const f of files) reports.push(await check(f, opts, terms, aliasData));
  if (opts.json) console.log(JSON.stringify(reports, null, 2));
  else reports.forEach(print);
  const errors = reports.reduce((n, r) => n + r.aliases.length + r.headings.length, 0);
  if (!opts.json) console.log(errors ? `\n✗ ${errors} 個要改（別名、沒資訊的標題）` : '\n✓ 沒有要改的（? 是提醒，自己判斷要不要補）');
  process.exit(errors ? 1 : 0);
} else {
  console.error('用法：terms.mjs list | check <文章…> | check --all  [--json]');
  process.exit(2);
}
