import { useEffect, useState } from 'react';
import type { ThemeName } from './themes';

const query = (q: string) => globalThis.matchMedia?.(q);

function current(): ThemeName {
  if (query('(forced-colors: active)')?.matches) return 'contrast';
  if (query('(prefers-color-scheme: dark)')?.matches) return 'dark';
  return 'light';
}

/** Follows the OS colour scheme and forced-colors (high contrast) setting. */
export function useThemeName(): ThemeName {
  const [name, setName] = useState<ThemeName>(current);
  useEffect(() => {
    const lists = ['(forced-colors: active)', '(prefers-color-scheme: dark)']
      .map(query)
      .filter((l): l is MediaQueryList => Boolean(l));
    const update = () => setName(current());
    lists.forEach((l) => l.addEventListener('change', update));
    return () => lists.forEach((l) => l.removeEventListener('change', update));
  }, []);
  return name;
}
