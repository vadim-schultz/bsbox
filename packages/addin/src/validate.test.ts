import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { localizationProblems, type Json } from './validate';

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
