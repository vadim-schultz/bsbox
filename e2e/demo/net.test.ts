import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { assertLocalUrl, isPortFree } from './net';

describe('assertLocalUrl', () => {
  it('accepts localhost and 127.0.0.1', () => {
    expect(() => assertLocalUrl('http://localhost:8788')).not.toThrow();
    expect(() => assertLocalUrl('http://127.0.0.1:8788')).not.toThrow();
  });

  it('refuses anything else', () => {
    expect(() => assertLocalUrl('https://bsbox.example.com')).toThrow('non-local target');
  });
});

describe('isPortFree', () => {
  it('is false while something listens and true after it stops', async () => {
    const server = createServer();
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as AddressInfo).port;
    expect(await isPortFree(port)).toBe(false);
    await new Promise((r) => server.close(r));
    expect(await isPortFree(port)).toBe(true);
  });
});
