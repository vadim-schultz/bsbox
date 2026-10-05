import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { assertNodeVersion, assertPortsFree } from './stack';

describe('assertNodeVersion', () => {
  it('accepts 22 and newer, rejects older', () => {
    expect(() => assertNodeVersion('v22.1.0')).not.toThrow();
    expect(() => assertNodeVersion('v26.5.1')).not.toThrow();
    expect(() => assertNodeVersion('v20.11.0')).toThrow('Node >= 22');
  });
});

describe('assertPortsFree', () => {
  it('fails fast naming the busy port', async () => {
    const server = createServer();
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as AddressInfo).port;
    await expect(assertPortsFree([port])).rejects.toThrow(`port ${port} is already in use`);
    await new Promise((r) => server.close(r));
    await expect(assertPortsFree([port])).resolves.toBeUndefined();
  });
});
