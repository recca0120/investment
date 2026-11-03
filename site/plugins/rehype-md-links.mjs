// 把指向其他 .md/.mdx 的相對連結改寫成網站路由。
// 讓 docs/ 裡的連結同時能在 GitHub 上點、也能在網站上點。
import path from 'node:path';
import { visit } from 'unist-util-visit';

/** @param {{ contentDir: string, base?: string }} opts */
export default function rehypeMdLinks({ contentDir, base = '/' }) {
	const root = path.resolve(contentDir);
	const prefix = base.endsWith('/') ? base : `${base}/`;
	return (tree, file) => {
		const from = file.path ?? file.history?.[0];
		if (!from || !path.resolve(from).startsWith(root)) return;
		visit(tree, 'element', (node) => {
			const href = node.tagName === 'a' && node.properties?.href;
			if (typeof href !== 'string' || /^[a-z]+:|^\/|^#/i.test(href)) return;
			const m = href.match(/^([^#?]+?)\.mdx?(#.*)?$/i);
			if (!m) return;
			const target = path.relative(root, path.resolve(path.dirname(from), m[1]));
			if (target.startsWith('..')) return; // 指到 docs/ 外面的就不處理
			const slug = target.split(path.sep).join('/').toLowerCase().replace(/(^|\/)index$/, '');
			node.properties.href = `${prefix}${slug ? `${slug}/` : ''}${m[2] ?? ''}`;
		});
	};
}
