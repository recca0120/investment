// 設計 token（#22）：顏色只寫在 site/design/tokens.ts，編譯成 Starlight、Tailwind、daisyUI 三組 CSS 變數
import { describe, expect, test } from 'vitest';
import { compileTheme } from '@site/design/compile';
import { tokens, type Tokens } from '@site/design/tokens';

type Mode = 'light' | 'dark';

/** 把編譯結果解析成「某個模式下，每個變數最後的值」：依序套用 CSS 區塊，再把 var() 一路展開 */
function resolved(css: string, mode: Mode): Record<string, string> {
  const blocks = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, head, body]) => ({ head: head.trim(), body }));
  const applies = (head: string, body: string) =>
    head === ':root' || // 夜間是 Starlight 的預設，日間區塊再覆蓋
    head === '@theme inline' ||
    (mode === 'light' && head === ":root[data-theme='light']") ||
    (head.startsWith('@plugin') && new RegExp(`name:\\s*'${mode}'`).test(body)); // daisyUI 主題
  const vars: Record<string, string> = {};
  for (const { head, body } of blocks) {
    if (!applies(head, body)) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[name] = value.trim();
  }
  const resolve = (v: string, depth = 0): string =>
    depth > 10 ? v : v.replace(/var\((--[\w-]+)\)/g, (_, n) => resolve(vars[n] ?? `undefined(${n})`, depth + 1));
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, resolve(v)]));
}

// WCAG 2.x 相對亮度與對比
function luminance(hex: string) {
  const [r, g, b] = hex.replace('#', '').match(/../g)!.map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('[#22-13] 設計 token', () => {
  test('改 tokens 的一個顏色，Starlight、Tailwind、daisyUI 三組變數都跟著變', () => {
    const changed: Tokens = structuredClone(tokens);
    changed.palette.light.sky = '#123456';
    const css = compileTheme(changed);
    const light = resolved(css, 'light');

    expect(light['--sl-color-bg-sidebar']).toBe('#123456'); // Starlight
    expect(light['--color-sky']).toBe('#123456'); // Tailwind：bg-sky
    expect(light['--color-base-200']).toBe('#123456'); // daisyUI：bg-base-200
    expect(css.match(/#123456/gi)).toHaveLength(1); // 原始值只出現一次，其他地方都是引用
    expect(resolved(css, 'dark')['--color-sky']).toBe(tokens.palette.dark.sky); // 夜間不受影響
  });

  test.each(['light', 'dark'] as const)('%s 模式：token 列出的每組文字／底色對比至少 4.5:1', (mode) => {
    const p = tokens.palette[mode];
    const low = tokens.contrastPairs
      .map(([fg, bg]) => ({ pair: `${fg} ${p[fg]} 對 ${bg} ${p[bg]}`, ratio: contrast(p[fg], p[bg]) }))
      .filter(({ ratio }) => ratio < 4.5)
      .map(({ pair, ratio }) => `${pair}：${ratio.toFixed(2)}`);
    expect(low).toEqual([]);
  });

  test('編譯結果裡每個變數都解得開（沒有引用到不存在的 token）', () => {
    const css = compileTheme(tokens);
    for (const mode of ['light', 'dark'] as const) {
      const broken = Object.entries(resolved(css, mode)).filter(([, v]) => v.includes('undefined('));
      expect(broken).toEqual([]);
    }
  });
});

// 突變測試發現：變數名稱的規則（coinInk → --c-coin-ink）改了也抓不到，因為測試只比對編譯結果內部是否一致；
// 但手寫的 site/styles/starlight.css 和回測器的圖表（Backtester.astro）直接用這些名稱，名稱一變顏色就消失
describe('[#22-13] 給手寫 CSS 和程式用的名稱', () => {
  const css = compileTheme(tokens);

  test('[#22-13] 調色盤變數的名稱固定（camelCase 轉成 kebab-case，數字前也加 -）', () => {
    for (const name of ['--c-sky', '--c-coin-ink', '--c-text-accent', '--c-gray-3', '--c-accent-low']) {
      expect(css, name).toMatch(new RegExp(`${name}:\\s*#`));
    }
  });

  test('[#22-13] daisyUI 的夜間主題是預設（沒有 JS 時也用夜間，和 Starlight 一致）', () => {
    const theme = (name: string) => css.match(new RegExp(`@plugin 'daisyui/theme' \\{[^}]*name: '${name}';[^}]*\\}`))![0];
    expect(theme('dark')).toMatch(/default: true;[\s\S]*prefersdark: true;[\s\S]*color-scheme: dark;/);
    expect(theme('light')).toMatch(/default: false;[\s\S]*prefersdark: false;[\s\S]*color-scheme: light;/);
  });
});
