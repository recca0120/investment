// docs/ 裡會發佈的文章：{ 路徑, slug, 標題 }，標題取自 frontmatter（新增文章時測試不用改）
import { readFileSync, readdirSync } from 'node:fs';

export const SECTIONS = [
  { dir: 'knowledge', label: '投資知識' },
  { dir: 'glossary', label: '名詞解釋' },
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
      const title = source.match(/^title:\s*(.+)$/m)![1].trim();
      // 拆成好幾頁的文章，側欄顯示的是頁籤名稱（frontmatter 的 part.label，例如「① 選管道」）
      const partLabel = source.match(/^part:\n(?:\s+.+\n)*?\s+label:\s*(.+)$/m)?.[1].trim();
      return { slug, path: `${section}/${slug}/`, title, sidebarLabel: partLabel ?? title };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
