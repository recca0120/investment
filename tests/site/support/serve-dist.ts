// 讓 Browser Mode 的測試伺服器在 /investment/ 底下提供 build 好的 dist/，
// 測試頁就能用同源 iframe 打開真正的網站頁面、讀取版面資訊
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import type { Plugin } from 'vite';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function serveDist(base = '/investment/', dist = 'dist'): Plugin {
  return {
    name: 'serve-dist',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith(base)) return next();
        let file = normalize(join(dist, decodeURIComponent(url.slice(base.length))));
        if (!file.startsWith(normalize(dist))) return next();
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
        if (!existsSync(file)) return next();
        res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
  };
}
