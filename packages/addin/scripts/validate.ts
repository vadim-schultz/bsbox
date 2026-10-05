import { readFileSync } from 'node:fs';
import { validateManifest } from 'office-addin-manifest';
import { localizationProblems, type Json } from '../src/validate.ts';

const root = new URL('../', import.meta.url);
const path = (name: string) => new URL(name, root);
const read = <T>(name: string) => JSON.parse(readFileSync(path(name), 'utf8')) as T;

const schema = await validateManifest(path('manifest.json').pathname);
const problems = [
  ...(schema.isValid
    ? []
    : (schema.report?.errors ?? []).map((e) => `schema: ${e.content ?? 'invalid'}`)),
  ...localizationProblems(read<Json>('manifest.json'), read<Record<string, string>>('de.json')),
];

if (problems.length > 0) {
  console.error(`manifest invalid:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('manifest ok');
