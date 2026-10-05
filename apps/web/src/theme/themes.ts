import {
  teamsHighContrastTheme,
  webDarkTheme,
  webLightTheme,
  type Theme,
} from '@fluentui/react-components';

export type ThemeName = 'light' | 'dark' | 'contrast';

export const themes: Record<ThemeName, Theme> = {
  light: webLightTheme,
  dark: webDarkTheme,
  contrast: teamsHighContrastTheme,
};
