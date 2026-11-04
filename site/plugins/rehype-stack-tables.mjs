// 手機上要「依列排」的表格（#54、#58）：加上 class="stack-table"，每一格記下欄名（data-label），
// 手機上用 CSS 把每一列變成一段、第一格當小標題、其他格前面顯示欄名（樣式在 site/styles/starlight.css）。
// 哪些表要依列排：
// - 比較表（第一格表頭是空的，例如文章 08「四種管道比較」）
// - 文字表：第一欄以外有任何一欄不是數字（數字欄由 rehype-num-cells 先標上 class="num"，所以這個外掛要排在它後面）
// - 5 欄以上：數字表也放不下 375px 的畫面
// 其他（例如文章 07 的四欄數字表）維持表格。
import { visit } from 'unist-util-visit';

function text(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(text).join('');
}

const cellsOf = (tr) => tr.children.filter((c) => c.type === 'element' && (c.tagName === 'td' || c.tagName === 'th'));
const classes = (node) => {
  const cls = node.properties.className ?? [];
  return Array.isArray(cls) ? cls : [cls];
};

export default function rehypeStackTables() {
  return (tree) => {
    visit(tree, 'element', (table) => {
      if (table.tagName !== 'table') return;
      const rows = [];
      visit(table, 'element', (tr) => {
        if (tr.tagName === 'tr') rows.push(tr);
      });
      const [head, ...body] = rows;
      if (!head || body.length === 0) return;
      const headers = cellsOf(head).map((th) => text(th).replace(/\s+/g, ' ').trim());
      const columns = headers.length;
      const compare = headers[0] === '';
      const textColumn = headers.some((_, col) => col > 0 && body.some((tr) => cellsOf(tr)[col] && !classes(cellsOf(tr)[col]).includes('num')));
      if (!compare && !textColumn && columns < 5) return;
      table.properties.className = [...classes(table), 'stack-table'];
      for (const tr of body) {
        cellsOf(tr).forEach((cell, col) => {
          if (col > 0 && headers[col]) cell.properties.dataLabel = headers[col];
        });
      }
    });
  };
}
