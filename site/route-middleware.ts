/**
 * Starlight route middleware（#22）：「上一篇／下一篇」不跨區
 *
 * starlight-sidebar-topics 0.9 本來就會在每區的第一篇／最後一篇拿掉 prev／next，
 * 但它拿含 base 的 href（investment/knowledge/…）和不含 base 的頁面 id（knowledge/…）比對，
 * 網站有 base（/investment）時永遠對不上，所以這裡自己用網址的第一段判斷是不是同一區
 */
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const sectionOf = (href: string) => href.slice(base.length).split('/').filter(Boolean)[0];

export const onRequest = defineRouteMiddleware(({ locals }) => {
  const { id, pagination } = locals.starlightRoute;
  const here = id.split('/')[0];
  if (pagination.prev && sectionOf(pagination.prev.href) !== here) pagination.prev = undefined;
  if (pagination.next && sectionOf(pagination.next.href) !== here) pagination.next = undefined;
});
