/** Pure manifest checks that the schema validator cannot make: localization completeness. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const TRANSLATABLE = new Set(['label', 'title', 'description', 'short', 'full']);

/** JSON paths of every user-visible string in the manifest, e.g. `name.short`. */
export function translatablePaths(node: Json, path = ''): string[] {
  if (Array.isArray(node)) return node.flatMap((v, i) => translatablePaths(v, `${path}[${i}]`));
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => {
    const next = path ? `${path}.${key}` : key;
    if (typeof value === 'string') return TRANSLATABLE.has(key) && isUiPath(next) ? [next] : [];
    return key === 'icons' ? [] : translatablePaths(value, next);
  });
}

const isUiPath = (p: string): boolean =>
  /^(name|description)\./.test(p) || /^extensions\[\d+\]\.ribbons\[/.test(p);

export function localizationProblems(manifest: Json, german: Record<string, string>): string[] {
  const problems: string[] = [];
  const info = (
    manifest as { localizationInfo?: { additionalLanguages?: { languageTag: string }[] } }
  ).localizationInfo;
  if (!info?.additionalLanguages?.some((l) => l.languageTag === 'de')) {
    problems.push('localizationInfo does not declare de');
  }
  for (const path of translatablePaths(manifest)) {
    if (!german[path]?.trim()) problems.push(`missing de label: ${path}`);
  }
  return problems;
}

interface DomainManifest {
  validDomains?: string[];
  developer?: Record<string, string | undefined>;
}

const hostOf = (url: string | undefined): string | null => {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
};

/** validDomains must be wildcard-free and cover the legal URLs. */
export function domainProblems(manifest: Json): string[] {
  const { validDomains = [], developer = {} } = manifest as DomainManifest;
  const problems = validDomains
    .filter((d) => d.includes('*'))
    .map((d) => `validDomains has wildcard: ${d}`);
  for (const key of ['privacyUrl', 'termsOfUseUrl']) {
    const host = hostOf(developer[key]);
    if (!host || !validDomains.includes(host)) {
      problems.push(`developer.${key} is not on a valid domain`);
    }
  }
  return problems;
}

export const LISTING_LANGUAGES = ['en', 'de'] as const;
const LISTING_FIELDS = ['title', 'shortDescription', 'longDescription'] as const;

export type Listing = Partial<Record<(typeof LISTING_FIELDS)[number], string>> & {
  screenshots?: string[];
};

/** Every listing field must be filled in both languages, with at least one screenshot. */
export function listingProblems(listings: Partial<Record<string, Listing>>): string[] {
  return LISTING_LANGUAGES.flatMap((lang) => {
    const l = listings[lang];
    if (!l) return [`${lang} listing: missing`];
    const missing = LISTING_FIELDS.filter((f) => !l[f]?.trim()).map(
      (f) => `${lang} listing: missing ${f}`,
    );
    return l.screenshots?.length ? missing : [...missing, `${lang} listing: no screenshots`];
  });
}
