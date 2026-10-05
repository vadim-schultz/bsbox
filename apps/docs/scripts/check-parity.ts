import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listPages, pageKey } from './pages.ts';

const LOCALES = ['en', 'de'] as const;

/** Returns one message per page that exists in one locale but not the other. */
export function checkParity(docsRoot: string): string[] {
  const keys = LOCALES.map((l) => new Set(listPages(join(docsRoot, l)).map(pageKey)));
  const problems: string[] = [];
  LOCALES.forEach((locale, i) => {
    const other = keys[1 - i];
    for (const key of keys[i] ?? []) {
      if (!other?.has(key)) problems.push(`missing ${LOCALES[1 - i]} page: ${key}`);
    }
  });
  return problems.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../src/content/docs', import.meta.url));
  if (!existsSync(root)) throw new Error(`docs root not found: ${root}`);
  const problems = checkParity(root);
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('docs parity ok');
}
