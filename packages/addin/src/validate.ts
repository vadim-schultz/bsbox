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
