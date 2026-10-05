import type { ThemeName } from './themes';

/** Stub: maps the teams-js theme string to a Fluent theme name. Wired up in the Teams chapter. */
export function mapTeamsTheme(teamsTheme: string | undefined): ThemeName {
  if (teamsTheme === 'dark') return 'dark';
  if (teamsTheme === 'contrast') return 'contrast';
  return 'light';
}
