/* global console, process */
// Merges the docs site and the SPA into apps/worker/.assets (one Workers Static Assets directory).
// The SPA is copied last so its index.html wins over the docs redirect page at "/".
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'apps/worker/.assets');
const sources = [path.join(root, 'apps/docs/dist'), path.join(root, 'apps/web/dist')];

for (const dir of sources) {
  if (!existsSync(dir)) {
    console.error(`stage-assets: missing ${dir}; run pnpm build first`);
    process.exit(1);
  }
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const dir of sources) cpSync(dir, out, { recursive: true });
console.log(`stage-assets: ${out}`);
