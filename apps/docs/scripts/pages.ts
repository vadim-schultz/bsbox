import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Relative paths (posix, with extension) of all markdown pages below `dir`. */
export function listPages(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.mdx?$/.test(name)) out.push(relative(dir, full).split('\\').join('/'));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

export function pageKey(path: string): string {
  return path.replace(/\.mdx?$/, '');
}
