import { describe, expect, it } from 'vitest';
import { en } from './strings.en';
import { de } from './strings.de';
import { parityProblems } from './parity';

describe('catalogue parity', () => {
  it('en and de have identical keys and placeholders', () => {
    expect(parityProblems(en, de)).toEqual([]);
  });

  it('reports a missing key and differing placeholders', () => {
    const a = { x: 'one', y: 'Hello {name}', z: 'zed' };
    const b = { x: 'eins', y: 'Hallo {who}' };
    expect(parityProblems(a, b)).toEqual(['placeholders differ: y', 'missing key in de: z']);
  });
});
