import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node's own experimental localStorage can shadow jsdom's; use a deterministic in-memory one.
const data = new Map<string, string>();
const storage = {
  getItem: (k: string) => data.get(k) ?? null,
  setItem: (k: string, v: string) => void data.set(k, String(v)),
  removeItem: (k: string) => void data.delete(k),
  clear: () => data.clear(),
};

beforeEach(() => {
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  cleanup();
  data.clear();
});
