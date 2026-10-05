import { de } from './strings.de';
import { en, type Catalogue, type StringKey } from './strings.en';
import type { Locale } from './locale';

const catalogues: Record<Locale, Catalogue> = { en, de };

export type Params = Record<string, string | number>;

export function translate(locale: Locale, key: StringKey, params: Params = {}): string {
  return catalogues[locale][key].replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}
