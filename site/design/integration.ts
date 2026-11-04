/**
 * Astro integration：build／dev 開始時把 tokens.ts 編譯成 site/styles/generated/tokens.css（#22）
 * dev 時改 tokens.ts 會重新載入設定，重新產生 CSS
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { compileTheme } from './compile.ts';
import { tokens } from './tokens.ts';

export default function designTokens(): AstroIntegration {
  return {
    name: 'design-tokens',
    hooks: {
      'astro:config:setup': ({ config, addWatchFile, logger }) => {
        const out = fileURLToPath(new URL('./site/styles/generated/tokens.css', config.root));
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, compileTheme(tokens));
        addWatchFile(new URL('./site/design/tokens.ts', config.root));
        addWatchFile(new URL('./site/design/compile.ts', config.root));
        logger.info('已從 site/design/tokens.ts 產生 site/styles/generated/tokens.css');
      },
    },
  };
}
