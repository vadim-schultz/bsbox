import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkLinks } from './check-links.ts';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'links-'));
  dirs.push(root);
  for (const [f, body] of Object.entries(files)) {
    const path = join(root, f);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, body);
  }
  return root;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('checkLinks', () => {
  it('passes for links to existing pages, anchors and external urls', () => {
    const root = fixture({
      'en/index.md': '[a](/en/guide/) [b](/en/guide/#x) [c](https://example.com)',
      'en/guide.md': 'text',
    });
    expect(checkLinks(root)).toEqual([]);
  });

  it('fails for a link to a non-existent page', () => {
    const root = fixture({ 'en/index.md': '[a](/en/nope/)' });
    expect(checkLinks(root)).toEqual(['en/index.md: broken link /en/nope/']);
  });
});
