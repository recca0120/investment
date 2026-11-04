// 文章結尾的「## 資料來源」在網站上收合成 <details>，摘要標示筆數（#22-14）
// - 查證時資料來源要在同一頁，所以不另開頁面；但十幾筆連結會讓人以為後面還有內容，所以預設收合
// - Markdown 原稿不用改（GitHub 上看仍是一般清單）
// - 標題變成 <summary> 後不再是 h2，右側「本頁內容」就不會列出它
import { toString } from 'hast-util-to-string';

const HEADING = '資料來源';
const isH2 = (node) => node.type === 'element' && node.tagName === 'h2';

function countLinks(node) {
  if (node.type !== 'element') return 0;
  const self = node.tagName === 'a' && /^https?:\/\//.test(String(node.properties?.href ?? '')) ? 1 : 0;
  return self + (node.children ?? []).reduce((sum, child) => sum + countLinks(child), 0);
}

export default function rehypeCollapseSources() {
  return (tree) => {
    const start = tree.children.findIndex((n) => isH2(n) && toString(n).trim() === HEADING);
    if (start === -1) return;
    const next = tree.children.findIndex((n, i) => i > start && isH2(n));
    const end = next === -1 ? tree.children.length : next;
    const body = tree.children.slice(start + 1, end);
    const links = body.reduce((sum, n) => sum + countLinks(n), 0);

    tree.children.splice(start, end - start, {
      type: 'element',
      tagName: 'details',
      properties: { className: ['sources'] },
      children: [
        { type: 'element', tagName: 'summary', properties: {}, children: [{ type: 'text', value: `${HEADING}（${links} 筆）` }] },
        ...body,
      ],
    });
  };
}
