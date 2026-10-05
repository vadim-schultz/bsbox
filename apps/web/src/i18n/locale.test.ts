import { describe, expect, it } from 'vitest';
import { resolveLocale } from './locale';
import { formatDate } from './format';

describe('resolveLocale', () => {
  it('prefers the stored choice, then host, then navigator, then en', () => {
    expect(resolveLocale({ stored: 'de', host: 'en-US', navigator: 'en' })).toBe('de');
    expect(resolveLocale({ stored: null, host: 'de-DE', navigator: 'en' })).toBe('de');
    expect(resolveLocale({ stored: null, host: null, navigator: 'de-AT' })).toBe('de');
    expect(resolveLocale({ stored: null, host: null, navigator: 'fr-FR' })).toBe('en');
    expect(resolveLocale({})).toBe('en');
  });

  it('ignores unsupported stored values and falls through', () => {
    expect(resolveLocale({ stored: 'fr', host: 'de-DE', navigator: 'en' })).toBe('de');
  });

  it('formats dates differently in German and English', () => {
    const d = new Date(Date.UTC(2026, 2, 5, 12, 0, 0));
    expect(formatDate(d, 'de')).not.toBe(formatDate(d, 'en'));
  });
});
