// 表格中「整欄都是數字」（含千分位、%、+/-、元；— 與空白視為空值）的欄位加上 class="num"，讓 CSS 右對齊。
// 以整欄判斷：代號欄同時有 0050 和 VT 時不會變成一半靠右、一半靠左。
import { visit } from 'unist-util-visit';

const NUMERIC = /^[+\-−]?[\d,]+(\.\d+)?\s*(%|元|倍)?$/;

function text(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(text).join('');
}

function addClass(node) {
  const cls = node.properties.className ?? [];
  node.properties.className = [...(Array.isArray(cls) ? cls : [cls]), 'num'];
}

export default function rehypeNumCells() {
  return (tree) => {
    visit(tree, 'element', (table) => {
      if (table.tagName !== 'table') return;
      const rows = [];
      visit(table, 'element', (tr) => {
        if (tr.tagName === 'tr') rows.push(tr.children.filter((c) => c.type === 'element'));
      });
      const [head, ...body] = rows;
      if (!head || body.length === 0) return;
      head.forEach((th, col) => {
        const cells = body.map((r) => r[col]).filter(Boolean);
        const values = cells.map((c) => text(c).trim()).filter((v) => v && v !== '—' && v !== '-');
        if (values.length === 0 || !values.every((v) => NUMERIC.test(v))) return;
        cells.forEach(addClass);
        addClass(th);
      });
    });
  };
}
