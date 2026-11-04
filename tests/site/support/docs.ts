// docs/ 裡會發佈的文章：{ 路徑, slug, 標題 }，標題取自 frontmatter（新增文章時測試不用改）
import { readFileSync, readdirSync } from 'node:fs';

export const SECTIONS = [
  { dir: 'knowledge', label: '投資知識' },
  { dir: 'decisions', label: '決策紀錄' },
  { dir: 'log', label: '討論紀錄' },
] as const;

export type SectionDir = (typeof SECTIONS)[number]['dir'];

export function publishedDocs(section: SectionDir) {
  return readdirSync(`docs/${section}`, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.mdx?$/.test(e.name) && e.name !== 'README.md')
    .map((e) => {
      const slug = e.name.replace(/\.mdx?$/, '');
      const source = readFileSync(`docs/${section}/${e.name}`, 'utf8');
      return { slug, path: `${section}/${slug}/`, title: source.match(/^title:\s*(.+)$/m)![1].trim() };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
