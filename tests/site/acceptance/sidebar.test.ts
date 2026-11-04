// 驗收：文章頁的側欄與網站分區（#15、#22）
// Starlight autogenerate 設錯目錄時，側欄會是空的，但 build 不會報錯
import { within } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { openPage } from '../support/dist';
import { SECTIONS, publishedDocs } from '../support/docs';

const sidebar = (screen: ReturnType<typeof openPage>['screen']) =>
  within(screen.getByRole('navigation', { name: '主要' }));

describe('側欄', () => {
  test.each(SECTIONS)('[#15-1] $label：側欄列出這一區的每一篇文章，目前頁面標示為 aria-current', ({ dir }) => {
    const docs = publishedDocs(dir);
    const current = docs[0];
    const nav = sidebar(openPage(current.path).screen);

    for (const doc of docs) {
      expect(nav.getByRole('link', { name: new RegExp(doc.sidebarLabel) }), doc.path).toHaveAttribute(
        'href',
        `/investment/${doc.path}`,
      );
    }
    expect(nav.getByRole('link', { name: new RegExp(current.sidebarLabel) })).toHaveAttribute('aria-current', 'page');
  });
});

describe('網站分區', () => {
  test.each(SECTIONS)('[#22-1] $label 的文章頁：頂部有三個分區、目前分區有標示；側欄只列這一區', ({ dir, label }) => {
    const { screen } = openPage(publishedDocs(dir)[0].path);

    // 桌機放在頂部、手機放在側欄選單裡，兩個位置都要正確
    const topicNavs = screen.getAllByRole('navigation', { name: '網站分區' });
    for (const topicNav of topicNavs) {
      const topics = within(topicNav);
      for (const other of SECTIONS) {
        const link = topics.getByRole('link', { name: new RegExp(other.label) });
        if (other.label === label) expect(link).toHaveAttribute('aria-current', 'page');
        else expect(link).not.toHaveAttribute('aria-current');
      }
    }

    const nav = sidebar(screen);
    for (const other of SECTIONS.filter((s) => s.dir !== dir)) {
      for (const doc of publishedDocs(other.dir)) {
        expect(nav.queryByRole('link', { name: new RegExp(doc.title) }), `${label} 的側欄出現 ${doc.path}`).toBeNull();
      }
    }
  });

  test.each(SECTIONS)('[#22-2] $label：「下一篇」只會連到同一區的文章', ({ dir }) => {
    for (const doc of publishedDocs(dir)) {
      const next = openPage(doc.path).document.querySelector('a[rel="next"]');
      if (next) expect(next.getAttribute('href'), `${doc.path} 的下一篇`).toMatch(new RegExp(`^/investment/${dir}/`));
    }
  });
});
