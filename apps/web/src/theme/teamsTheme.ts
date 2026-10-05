import type { ThemeName } from './themes';

/** Maps the teams-js theme string (default, dark, contrast) to a Fluent theme name. */
export function mapTeamsTheme(teamsTheme: string | undefined): ThemeName {
  if (teamsTheme === 'dark') return 'dark';
  if (teamsTheme === 'contrast') return 'contrast';
  return 'light';
}
