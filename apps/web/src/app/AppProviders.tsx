import type { ReactNode } from 'react';
import { FluentProvider } from '@fluentui/react-components';
import { LocaleProvider } from '../i18n';
import { themes, useThemeName } from '../theme';

export function AppProviders({ children }: { children: ReactNode }) {
  const name = useThemeName();
  return (
    <LocaleProvider>
      <FluentProvider theme={themes[name]}>{children}</FluentProvider>
    </LocaleProvider>
  );
}
