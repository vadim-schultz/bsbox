import { afterEach, describe, expect, it, vi } from 'vitest';
import { readToken, resetTokenMemory, storeToken } from './tokenStore';

afterEach(() => {
  vi.unstubAllGlobals();
  resetTokenMemory();
  history.replaceState(null, '', '/');
});

const blockedStorage = () => {
  const boom = () => {
    throw new DOMException('blocked', 'SecurityError');
  };
  vi.stubGlobal('localStorage', { getItem: boom, setItem: boom });
};

describe('tokenStore', () => {
  it('round-trips through localStorage', () => {
    storeToken('s1', 'tok');
    expect(readToken('s1')).toBe('tok');
    expect(location.hash).toBe('');
  });

  it('falls back to memory and the URL fragment when storage throws', () => {
    blockedStorage();
    storeToken('s1', 'tok');
    expect(readToken('s1')).toBe('tok');
    expect(location.hash).toContain('tok');
  });

  it('recovers the token from the fragment after memory is lost', () => {
    blockedStorage();
    storeToken('s1', 'tok');
    resetTokenMemory();
    expect(readToken('s1')).toBe('tok');
    expect(readToken('other')).toBeUndefined();
  });
});
