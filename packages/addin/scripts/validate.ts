import { existsSync, readFileSync } from 'node:fs';
import { validateManifest } from 'office-addin-manifest';
import {
  domainProblems,
  LISTING_LANGUAGES,
  listingProblems,
  localizationProblems,
  type Json,
  type Listing,
} from '../src/validate.ts';

const root = new URL('../', import.meta.url);
const path = (name: string) => new URL(name, root);
const read = <T>(name: string) => JSON.parse(readFileSync(path(name), 'utf8')) as T;

const listings = Object.fromEntries(
  LISTING_LANGUAGES.filter((l) => existsSync(path(`listing/${l}/listing.json`))).map((l) => [
    l,
    read<Listing>(`listing/${l}/listing.json`),
  ]),
);
const missingShots = Object.entries(listings).flatMap(([lang, l]) =>
  (l.screenshots ?? [])
    .filter((s) => !existsSync(path(`listing/${lang}/${s}`)))
    .map((s) => `${lang} listing: screenshot file missing: ${s}`),
);

const schema = await validateManifest(path('manifest.json').pathname);
const problems = [
  ...(schema.isValid
    ? []
    : (schema.report?.errors ?? []).map((e) => `schema: ${e.content ?? 'invalid'}`)),
  ...localizationProblems(read<Json>('manifest.json'), read<Record<string, string>>('de.json')),
  ...domainProblems(read<Json>('manifest.json')),
  ...listingProblems(listings),
  ...missingShots,
];

if (problems.length > 0) {
  console.error(`manifest invalid:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('manifest ok');
