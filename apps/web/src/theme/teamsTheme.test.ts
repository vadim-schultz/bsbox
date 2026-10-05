import { describe, expect, it } from 'vitest';
import { mapTeamsTheme } from './teamsTheme';
import { themes } from './themes';

describe('mapTeamsTheme', () => {
  it('maps Teams dark to the Fluent dark theme', () => {
    expect(themes[mapTeamsTheme('dark')]).toBe(themes.dark);
  });

  it('maps contrast to high contrast and default to light', () => {
    expect(mapTeamsTheme('contrast')).toBe('contrast');
    expect(mapTeamsTheme('default')).toBe('light');
  });

  it('falls back to light for unknown or missing themes', () => {
    expect(mapTeamsTheme('neon')).toBe('light');
    expect(mapTeamsTheme(undefined)).toBe('light');
  });
});
