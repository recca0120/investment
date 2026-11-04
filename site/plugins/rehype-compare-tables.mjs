// 比較表（第一格表頭是空的表，例如文章 08「四種管道比較」）：每一格記下欄名（data-label），
// 手機上改成「依項目排」時，用 CSS 的 ::before 在每格前面顯示欄名（#54，樣式在 site/styles/starlight.css）。
// 一般的數字表不動：手機上照樣左右滑。
import { visit } from 'unist-util-visit';

function text(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(text).join('');
}

const cellsOf = (tr) => tr.children.filter((c) => c.type === 'element' && (c.tagName === 'td' || c.tagName === 'th'));

export default function rehypeCompareTables() {
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
      if (headers[0] !== '') return;
      const cls = table.properties.className ?? [];
      table.properties.className = [...(Array.isArray(cls) ? cls : [cls]), 'compare-table'];
      for (const tr of body) {
        cellsOf(tr).forEach((cell, col) => {
          if (col > 0 && headers[col]) cell.properties.dataLabel = headers[col];
        });
      }
    });
  };
}
