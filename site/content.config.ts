import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  // collection 名稱必須是 docs，Starlight 靠這個名稱找內容
  docs: defineCollection({
    // README.md 是給 GitHub 瀏覽資料夾用的索引，不放進網站
    loader: glob({ pattern: ['**/[^_]*.{md,mdx}', '!**/README.md'], base: './docs' }),
    schema: docsSchema({
      extend: z.object({
        // 標題下方的「重點」，最多 3 點（#22，決策 0006）；知識文章必填（測試會檢查）
        summary: z.array(z.string()).min(1).max(3).optional(),
        // 一篇拆成好幾頁時：group 是這一組的名稱（新手路線上算一站），label 是這一頁的頁籤（例如「① 選管道」）
        part: z.object({ group: z.string(), label: z.string() }).optional(),
      }),
    }),
  }),
};
