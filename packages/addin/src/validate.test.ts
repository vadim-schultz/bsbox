import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { domainProblems, listingProblems, localizationProblems, type Json } from './validate';

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')) as never;

describe('manifest localization', () => {
  const manifest = read('manifest.json') as Json;
  const german = read('de.json') as Record<string, string>;

  it('the shipped manifest has a German string for every label', () => {
    expect(localizationProblems(manifest, german)).toEqual([]);
  });

  it('fails when a German label is missing', () => {
    const rest = { ...german };
    delete rest['extensions[0].ribbons[0].tabs[0].groups[0].controls[0].label'];
    expect(localizationProblems(manifest, rest)).toEqual([
      'missing de label: extensions[0].ribbons[0].tabs[0].groups[0].controls[0].label',
    ]);
  });

  it('fails when de is not declared', () => {
    const copy = { ...(manifest as object), localizationInfo: { defaultLanguageTag: 'en' } };
    expect(localizationProblems(copy as Json, german)).toContain(
      'localizationInfo does not declare de',
    );
  });
});

const listing = (over: Record<string, unknown> = {}) => ({
  title: 'BSBox',
  shortDescription: 'Short',
  longDescription: 'Long',
  screenshots: ['screenshots/live.png'],
  ...over,
});

describe('domain rules', () => {
  const manifest = read('manifest.json') as Json;

  it('the shipped manifest passes', () => {
    expect(domainProblems(manifest)).toEqual([]);
  });

  it('fails on a wildcard in validDomains', () => {
    const copy = { ...(manifest as object), validDomains: ['*.example.com'] };
    expect(domainProblems(copy as Json)).toContain('validDomains has wildcard: *.example.com');
  });

  it('fails when privacy or terms URLs leave the valid domains', () => {
    const copy = {
      ...(manifest as object),
      developer: { privacyUrl: 'https://evil.test/privacy', termsOfUseUrl: 'https://evil.test/t' },
    };
    expect(domainProblems(copy as Json)).toEqual([
      'developer.privacyUrl is not on a valid domain',
      'developer.termsOfUseUrl is not on a valid domain',
    ]);
  });
});

describe('listing rules', () => {
  it('accepts a complete listing in both languages', () => {
    expect(listingProblems({ en: listing(), de: listing() })).toEqual([]);
  });

  it('fails when a field is missing in one language', () => {
    expect(listingProblems({ en: listing(), de: listing({ longDescription: ' ' }) })).toEqual([
      'de listing: missing longDescription',
    ]);
  });

  it('fails when a language has no screenshots', () => {
    expect(listingProblems({ en: listing({ screenshots: [] }), de: listing() })).toEqual([
      'en listing: no screenshots',
    ]);
  });

  it('fails when the listing for a language is absent', () => {
    expect(listingProblems({ en: listing() })).toEqual(['de listing: missing']);
  });
});
