import type { ReactNode } from 'react';
import { LocaleProvider } from '../../../i18n';
import { displayLanguage } from '../services';

/** Resolves the locale from Office `displayLanguage` when no choice is stored. */
export function HostLocale({ children }: { children: ReactNode }) {
  return <LocaleProvider host={displayLanguage()}>{children}</LocaleProvider>;
}
