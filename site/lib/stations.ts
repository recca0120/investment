/**
 * 新手路線的「站」（#22，決策 0006）：側欄（Route.astro）和首頁（HomeRoute.astro）共用，兩邊才不會不一致
 * - 一篇拆成好幾頁（frontmatter 的 part）時，相鄰、同一組的頁面併成一站
 * - 輸入已經依路線排好順序（sidebar.order）
 */
export interface Part {
  group: string;
  label: string;
}

export interface Station<T> {
  /** 站名：一般文章是標題，拆頁的是組名 */
  label: string;
  /** 這一站的頁面；拆頁時 pageLabel 是頁籤名稱（例如「① 選管道」） */
  pages: (T & { pageLabel: string })[];
}

export function groupStations<T extends { label: string; part?: Part }>(items: T[]): Station<T>[] {
  const stations: Station<T>[] = [];
  for (const item of items) {
    const last = stations.at(-1);
    if (item.part && last?.label === item.part.group) last.pages.push({ ...item, pageLabel: item.part.label });
    else if (item.part) stations.push({ label: item.part.group, pages: [{ ...item, pageLabel: item.part.label }] });
    else stations.push({ label: item.label, pages: [{ ...item, pageLabel: item.label }] });
  }
  return stations;
}
