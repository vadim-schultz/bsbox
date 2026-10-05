import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listPages, pageKey } from './pages.ts';

const LINK = /\]\((\/[^)\s]*)\)/g;

/** Returns one message per internal link (starting with `/`) whose target page does not exist. */
export function checkLinks(docsRoot: string): string[] {
  const pages = ['en', 'de'].flatMap((l) => listPages(join(docsRoot, l)).map((p) => `${l}/${p}`));
  const known = new Set<string>();
  for (const p of pages) {
    const key = pageKey(p);
    known.add(key.endsWith('/index') ? key.slice(0, -'/index'.length) : key);
  }
  const problems: string[] = [];
  for (const page of pages) {
    const text = readFileSync(join(docsRoot, page), 'utf8');
    for (const match of text.matchAll(LINK)) {
      const href = match[1] ?? '';
      const target = href.split(/[#?]/)[0]?.replace(/^\/|\/$/g, '') ?? '';
      if (!known.has(target)) problems.push(`${page}: broken link ${href}`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkLinks(fileURLToPath(new URL('../src/content/docs', import.meta.url)));
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('docs links ok');
}
