export const LOCALES = ['en', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export const STORAGE_KEY = 'bsbox.locale';

const toLocale = (value: string | null | undefined): Locale | null => {
  const base = value?.toLowerCase().split('-')[0];
  return LOCALES.find((l) => l === base) ?? null;
};

export interface LocaleInputs {
  stored?: string | null;
  /** Office `displayLanguage` or Teams `app.getContext().app.locale`. */
  host?: string | null;
  navigator?: string | null;
}

/** stored choice, then host locale, then navigator.language, then en. */
export function resolveLocale(inputs: LocaleInputs): Locale {
  return toLocale(inputs.stored) ?? toLocale(inputs.host) ?? toLocale(inputs.navigator) ?? 'en';
}

export function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage unavailable (private mode); the choice lasts for this page only
  }
}
