/**
 * 網站的設計 token：所有顏色的原始值只寫在這裡（#22）
 * 由 site/design/compile.ts 編譯成 Starlight、Tailwind、daisyUI 的 CSS 變數，build 時自動產生，不要手改產生的檔案
 * 設計方向：小豬撲滿（docs/decisions/0005-site-style-piggy-bank.md）、版面（0006）
 * - 天空：淡天空藍的底，夜間是夜空
 * - 金幣：主要強調色，用在硬幣、編號、引言線這些「存錢」的地方
 * - 小豬粉：只用在撲滿本身
 */

type Hex = `#${string}`;

/** 一個模式（日間或夜間）的調色盤。名稱是「用途」，不是「顏色」 */
export interface Palette {
  /** 頁面底色 */
  sky: Hex;
  /** 卡片、表格等浮起來的底色 */
  cloud: Hex;
  /** 分隔線、外框 */
  rule: Hex;
  /** 一般文字 */
  ink: Hex;
  /** 最強的文字（標題）；Starlight 叫 white，日間其實是深色 */
  strong: Hex;
  /** 灰階：1 最接近文字，7 最接近底色（對應 Starlight 的 gray-1～7） */
  gray1: Hex;
  gray2: Hex;
  gray3: Hex;
  gray4: Hex;
  gray5: Hex;
  gray6: Hex;
  gray7: Hex;
  /** 金幣（強調色）與放在金幣上的文字 */
  coin: Hex;
  coinInk: Hex;
  /** 撲滿本體與它的線條；onPig 是放在小豬粉上的文字 */
  pig: Hex;
  pigInk: Hex;
  onPig: Hex;
  /** 連結、按鈕等互動元素 */
  accentLow: Hex;
  accent: Hex;
  accentHigh: Hex;
  textAccent: Hex;
  onAccent: Hex;
  /** 行內程式碼的底色 */
  code: Hex;
  /** 陰影與遮罩用的深色（日夜間都是深色；用 color-mix 調透明度，例如名詞小卡的陰影） */
  shade: Hex;
  /** 狀態色（daisyUI 的 badge、alert 會用到） */
  info: Hex;
  onInfo: Hex;
  success: Hex;
  onSuccess: Hex;
  warning: Hex;
  onWarning: Hex;
  error: Hex;
  onError: Hex;
}

export interface Tokens {
  palette: Record<'light' | 'dark', Palette>;
  /** 要檢查對比（WCAG AA 4.5:1）的「文字／底色」組合，日夜間都檢查 */
  contrastPairs: [keyof Palette, keyof Palette][];
  font: { sans: string };
  /** daisyUI 的形狀：圓角（選擇器／輸入框／卡片）、邊框粗細 */
  shape: { radiusSelector: string; radiusField: string; radiusBox: string; border: string };
}

export const tokens: Tokens = {
  palette: {
    light: {
      sky: '#eaf2fa',
      cloud: '#f8fbfe',
      rule: '#c9d8e8',
      ink: '#1e2a3a',
      strong: '#1e2a3a',
      gray1: '#263548',
      gray2: '#34465c',
      gray3: '#4e5f73',
      gray4: '#8193a8',
      gray5: '#b9c9da',
      gray6: '#d6e2ef',
      gray7: '#e2ecf6',
      coin: '#f2b632',
      coinInk: '#3d2a00',
      pig: '#f29cb4',
      pigInk: '#b5577a',
      onPig: '#4a1428',
      accentLow: '#d4e5f7',
      accent: '#1f64a8',
      accentHigh: '#164c82',
      textAccent: '#1f64a8',
      onAccent: '#f8fbfe',
      code: '#dce8f4',
      shade: '#0b1220',
      info: '#cfe3f7',
      onInfo: '#123a63',
      success: '#d3efdd',
      onSuccess: '#17532f',
      warning: '#fbe7b5',
      onWarning: '#5a3d00',
      error: '#f8d4d4',
      onError: '#7a1d1d',
    },
    dark: {
      sky: '#121b26',
      cloud: '#1a2533',
      rule: '#2b3a4d',
      ink: '#e8eef5',
      strong: '#f1f5fa',
      gray1: '#e1e9f2',
      gray2: '#c3d0de',
      gray3: '#9fb0c4',
      gray4: '#66788e',
      gray5: '#2b3a4d',
      gray6: '#1a2533',
      gray7: '#161f2b',
      coin: '#f5c451',
      coinInk: '#2e2100',
      pig: '#e98aa6',
      pigInk: '#8a3b57',
      onPig: '#3a0f20',
      accentLow: '#1c3550',
      accent: '#8ec1f2',
      accentHigh: '#c8e1fa',
      textAccent: '#a9d0f6',
      onAccent: '#121b26',
      code: '#2b3a4d',
      shade: '#000000',
      info: '#1c3550',
      onInfo: '#c8e1fa',
      success: '#17392a',
      onSuccess: '#b5ebc9',
      warning: '#3d2f0c',
      onWarning: '#fbe2a0',
      error: '#45201f',
      onError: '#f8c4c4',
    },
  },
  contrastPairs: [
    ['ink', 'sky'],
    ['ink', 'cloud'],
    ['strong', 'sky'],
    ['gray2', 'sky'],
    ['gray3', 'sky'],
    ['gray3', 'cloud'],
    ['textAccent', 'sky'],
    ['textAccent', 'cloud'],
    ['coinInk', 'coin'],
    ['onPig', 'pig'],
    ['onAccent', 'accent'],
    ['cloud', 'ink'],
    ['onInfo', 'info'],
    ['onSuccess', 'success'],
    ['onWarning', 'warning'],
    ['onError', 'error'],
  ],
  font: {
    sans: "'Chiron GoRound TC', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif",
  },
  shape: { radiusSelector: '1rem', radiusField: '0.75rem', radiusBox: '1.5rem', border: '1px' },
};
