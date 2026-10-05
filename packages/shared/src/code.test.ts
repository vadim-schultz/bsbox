import { describe, expect, it } from 'vitest';
import { CROCKFORD, generateCode, isValidCode } from './code';

describe('code', () => {
  it('generates 10 Crockford characters', () => {
    const c = generateCode();
    expect(c).toHaveLength(10);
    for (const ch of c) expect(CROCKFORD).toContain(ch);
    expect(isValidCode(c)).toBe(true);
  });

  it('rejects wrong length and excluded letters', () => {
    expect(isValidCode('ABC')).toBe(false);
    expect(isValidCode('ILOU000000')).toBe(false);
    expect(isValidCode('abcdefghjk')).toBe(false);
  });
});
