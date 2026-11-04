/**
 * 首頁用的文章資料（#22）：分區、新手路線順序、最近修改日期
 * 元件測試時 getCollection() 讀不到資料，所以元件都接受 props，預設才呼叫這裡
 */
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { getCollection } from 'astro:content';
import type { Part } from './stations';

/** 網站分區：順序與標籤和頂部分區（astro.config.mjs 的 starlightSidebarTopics）一致 */
export const SECTIONS = [
  { dir: 'knowledge', label: '投資知識', description: '新手路線：從開戶到回測結果，一站一站讀' },
  { dir: 'glossary', label: '名詞解釋', description: 'ETF、殖利率、複委託……看不懂的名詞分 6 類查' },
  { dir: 'decisions', label: '決策紀錄', description: '做過的決定和理由，包括自己選的入門方案' },
  { dir: 'log', label: '討論紀錄', description: '每次討論問了什麼、結論、待辦' },
] as const;

export interface DocInfo {
  id: string;
  title: string;
  description?: string;
  order?: number;
  part?: Part;
  /** 最後修改時間（ISO 8601，例如 2026-11-04T11:41:26+08:00）；同一天改很多篇時用時間排序 */
  updated: string;
}

/**
 * 每個檔案在 git 上最後一次修改的時間。整個 build 只跑一次 git log（原本每篇各跑一次，首頁要 24 秒）
 * 還沒 commit 的檔案（本機開發時）用檔案修改時間
 */
let gitDates: Map<string, string> | undefined;
function lastModified(file: string): string {
  if (!gitDates || import.meta.env.DEV) {
    gitDates = new Map();
    try {
      const log = execFileSync('git', ['log', '--format=@%cI', '--name-only', '--', 'docs'], { encoding: 'utf8' });
      let date = '';
      for (const line of log.split('\n')) {
        if (line.startsWith('@')) date = line.slice(1);
        else if (line && !gitDates.has(line)) gitDates.set(line, date); // log 由新到舊，第一次出現就是最後修改
      }
    } catch {}
  }
  return gitDates.get(file.replace(/^\.\//, '')) ?? statSync(file).mtime.toISOString();
}

// 快取只在 build 時用；dev server 要看到文章的修改
let cached: Promise<DocInfo[]> | undefined;
export function loadDocs(): Promise<DocInfo[]> {
  if (import.meta.env.DEV) cached = undefined;
  cached ??= getCollection('docs').then((entries) =>
    entries
      .filter((d) => d.id.includes('/')) // 首頁（index）不算
      .map((d) => ({
        id: d.id,
        title: d.data.title,
        description: d.data.description,
        order: d.data.sidebar.order,
        part: d.data.part,
        updated: d.filePath ? lastModified(d.filePath) : '',
      })),
  );
  return cached;
}

/** 某一區的文章，依側欄順序（sidebar.order，沒有的話依檔名） */
export function sectionDocs(docs: DocInfo[], dir: string): DocInfo[] {
  return docs
    .filter((d) => d.id.startsWith(`${dir}/`))
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id));
}
