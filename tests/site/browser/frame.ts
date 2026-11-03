// Browser Mode 共用：用同源 iframe 打開 build 好的頁面（由 support/serve-dist.ts 在 /investment/ 提供）
export const MOBILE = { width: 375, height: 812 };
export const DESKTOP = { width: 1400, height: 1000 };

interface FrameOptions {
  size?: { width: number; height: number };
  /** Starlight 的日夜模式，存在 localStorage（iframe 同源，所以在測試頁設定就有效） */
  theme?: 'light' | 'dark';
}

export async function openFrame(path: string, { size = DESKTOP, theme }: FrameOptions = {}) {
  if (theme) localStorage.setItem('starlight-theme', theme);
  else localStorage.removeItem('starlight-theme');
  const frame = document.createElement('iframe');
  frame.style.cssText = `width:${size.width}px;height:${size.height}px;border:0`;
  document.body.append(frame);
  await new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve();
    frame.onerror = () => reject(new Error(`打不開 ${path}`));
    frame.src = `/investment/${path}`;
  });
  const doc = frame.contentDocument!;
  await doc.fonts?.ready;
  const style = (selector: string) => {
    const el = doc.querySelector(selector);
    if (!el) throw new Error(`找不到 ${selector}（先執行 npm run build）`);
    return frame.contentWindow!.getComputedStyle(el);
  };
  return { doc, style, close: () => frame.remove() };
}
