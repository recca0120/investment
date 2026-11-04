// 網站處理 Markdown 的 rehype 外掛清單（順序有關係）。astro.config.mjs 和名詞檢查工具
// （.claude/skills/glossary/scripts/terms.mjs）都用這一份，工具說「會連成小卡」的名詞就是網站上真的會連的（#62）
import rehypeMdLinks from './rehype-md-links.mjs';
import rehypeNumCells from './rehype-num-cells.mjs';
import rehypeStackTables from './rehype-stack-tables.mjs';
import rehypeGlossaryLinks from './rehype-glossary-links.mjs';
import rehypeCollapseSources from './rehype-collapse-sources.mjs';

/** @param {{ base: string, contentDir?: string, glossaryDir?: string }} opts */
export function rehypePlugins({ base, contentDir = './docs', glossaryDir = './docs/glossary' }) {
  return [
    [rehypeMdLinks, { contentDir, base }],
    rehypeNumCells,
    rehypeStackTables, // 文字表手機上依列排（#54、#58）；要在 rehypeNumCells 之後、名詞連結之前
    // 知識文章裡的名詞第一次出現時連到名詞解釋（#24）
    [rehypeGlossaryLinks, { glossaryDir, contentDir, base }],
    rehypeCollapseSources, // 結尾的「資料來源」收合並標示筆數（#22）
  ];
}
