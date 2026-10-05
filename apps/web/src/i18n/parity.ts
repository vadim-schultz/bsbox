const placeholders = (s: string): string =>
  [...s.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

/** Returns human-readable problems when `other` does not mirror `base`. */
export function parityProblems(base: Record<string, string>, other: Record<string, string>) {
  const problems: string[] = [];
  for (const [key, value] of Object.entries(base)) {
    const translated = other[key];
    if (translated === undefined) problems.push(`missing key in de: ${key}`);
    else if (placeholders(value) !== placeholders(translated))
      problems.push(`placeholders differ: ${key}`);
  }
  for (const key of Object.keys(other)) {
    if (!(key in base)) problems.push(`extra key in de: ${key}`);
  }
  return problems;
}
