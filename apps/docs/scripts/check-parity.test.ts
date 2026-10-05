import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkParity } from './check-parity.ts';

const dirs: string[] = [];
function fixture(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'parity-'));
  dirs.push(root);
  for (const f of files) {
    const path = join(root, f);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, '---\ntitle: x\n---\n');
  }
  return root;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('checkParity', () => {
  it('passes when en and de have the same pages', () => {
    const root = fixture(['en/index.md', 'de/index.md', 'en/a/b.md', 'de/a/b.md']);
    expect(checkParity(root)).toEqual([]);
  });

  it('fails when a DE page is missing', () => {
    const root = fixture(['en/index.md', 'de/index.md', 'en/privacy.md']);
    expect(checkParity(root)).toEqual(['missing de page: privacy']);
  });

  it('fails when an EN page is missing', () => {
    const root = fixture(['en/index.md', 'de/index.md', 'de/terms.md']);
    expect(checkParity(root)).toEqual(['missing en page: terms']);
  });
});
