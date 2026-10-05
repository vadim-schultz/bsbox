import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readStoredLocale, resolveLocale, storeLocale, type Locale } from './locale';
import { translate, type Params } from './translate';
import type { StringKey } from './strings.en';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: StringKey, params?: Params) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children, host }: { children: ReactNode; host?: string | null }) {
  const [locale, setState] = useState<Locale>(() =>
    resolveLocale({ stored: readStoredLocale(), host, navigator: globalThis.navigator?.language }),
  );
  const setLocale = useCallback((next: Locale) => {
    storeLocale(next);
    setState(next);
  }, []);
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key, params) => translate(locale, key, params) }),
    [locale, setLocale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
