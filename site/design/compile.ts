/**
 * 把設計 token 編譯成 CSS（#22）
 *
 * 輸出（由 site/design/integration.ts 在 build／dev 開始時寫到 site/styles/generated/tokens.css）：
 * 1. 調色盤 --c-*：夜間放 :root（Starlight 預設深色），日間放 :root[data-theme='light']
 * 2. Starlight 的 --sl-color-*：一律引用 --c-*，切換日夜時自動跟著變
 * 3. daisyUI 主題：取名 light／dark，剛好對上 Starlight 切換日夜時設定的 data-theme
 * 4. Tailwind 的 @theme inline：bg-sky、text-muted 這類 utility
 *
 * 原始色值只出現在第 1 段，其他段都是 var() 引用。這些規則不放進 CSS 圖層：
 * 要蓋過 starlight-tailwind 在 utilities 圖層裡依 Tailwind 灰階產生的 --sl-color-*
 */
import type { Palette, Tokens } from './tokens';

type Key = keyof Palette;

const kebab = (s: string) => s.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`);
const ref = (key: Key) => `var(--c-${kebab(key)})`;

/** Starlight 變數 → 調色盤 */
const STARLIGHT: Record<string, Key> = {
  white: 'strong',
  'gray-1': 'gray1',
  'gray-2': 'gray2',
  'gray-3': 'gray3',
  'gray-4': 'gray4',
  'gray-5': 'gray5',
  'gray-6': 'gray6',
  'gray-7': 'gray7',
  black: 'sky',
  'accent-low': 'accentLow',
  accent: 'accent',
  'accent-high': 'accentHigh',
  'text-accent': 'textAccent',
  'bg-nav': 'sky',
  'bg-sidebar': 'sky',
  'bg-inline-code': 'code',
  hairline: 'rule',
  'hairline-light': 'rule',
};

/** daisyUI 主題色 → 調色盤（https://daisyui.com/docs/themes/） */
const DAISY: Record<string, Key> = {
  'base-100': 'cloud',
  'base-200': 'sky',
  'base-300': 'rule',
  'base-content': 'ink',
  primary: 'accent',
  'primary-content': 'onAccent',
  secondary: 'pig',
  'secondary-content': 'onPig',
  accent: 'coin',
  'accent-content': 'coinInk',
  neutral: 'ink',
  'neutral-content': 'cloud',
  info: 'info',
  'info-content': 'onInfo',
  success: 'success',
  'success-content': 'onSuccess',
  warning: 'warning',
  'warning-content': 'onWarning',
  error: 'error',
  'error-content': 'onError',
};

/** Tailwind 語意色（bg-*、text-*、border-*）→ 調色盤 */
const TAILWIND: Record<string, Key> = {
  sky: 'sky',
  cloud: 'cloud',
  rule: 'rule',
  ink: 'ink',
  coin: 'coin',
  'coin-ink': 'coinInk',
  pig: 'pig',
  'pig-ink': 'pigInk',
  heading: 'strong',
  soft: 'gray2',
  muted: 'gray3',
  link: 'textAccent',
  mark: 'accent',
  'accent-low': 'accentLow',
};

const decls = (entries: [string, string][], indent = '  ') =>
  entries.map(([name, value]) => `${indent}${name}: ${value};`).join('\n');

const palette = (p: Palette) => decls(Object.entries(p).map(([k, v]) => [`--c-${kebab(k)}`, v]));

function daisyTheme(name: 'light' | 'dark', t: Tokens) {
  const isDark = name === 'dark';
  return `@plugin 'daisyui/theme' {
  name: '${name}';
  default: ${isDark};
  prefersdark: ${isDark};
  color-scheme: ${name};
${decls(Object.entries(DAISY).map(([k, key]) => [`--color-${k}`, ref(key)]))}
  --radius-selector: ${t.shape.radiusSelector};
  --radius-field: ${t.shape.radiusField};
  --radius-box: ${t.shape.radiusBox};
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: ${t.shape.border};
  --depth: 0;
  --noise: 0;
}`;
}

export function compileTheme(t: Tokens): string {
  return `/* 自動產生，不要手改：來源 site/design/tokens.ts，由 site/design/compile.ts 編譯 */

/* 夜間（Starlight 預設） */
:root {
${palette(t.palette.dark)}

${decls(Object.entries(STARLIGHT).map(([k, key]) => [`--sl-color-${k}`, ref(key)]))}
}

/* 日間 */
:root[data-theme='light'] {
${palette(t.palette.light)}
}

${daisyTheme('light', t)}

${daisyTheme('dark', t)}

@theme inline {
${decls(Object.entries(TAILWIND).map(([k, key]) => [`--color-${k}`, ref(key)]))}
  --font-sans: ${t.font.sans};
}
`;
}
