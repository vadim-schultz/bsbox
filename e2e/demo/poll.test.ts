import { describe, expect, it } from 'vitest';
import { waitUntil } from './poll';

describe('waitUntil', () => {
  it('resolves once the probe succeeds', async () => {
    let calls = 0;
    await waitUntil(async () => ++calls >= 3, { timeoutMs: 1000, intervalMs: 1, what: 'x' });
    expect(calls).toBe(3);
  });

  it('treats a throwing probe as not ready yet', async () => {
    let calls = 0;
    const probe = async () => {
      if (++calls < 2) throw new Error('refused');
      return true;
    };
    await waitUntil(probe, { timeoutMs: 1000, intervalMs: 1, what: 'x' });
    expect(calls).toBe(2);
  });

  it('times out naming what it waited for', async () => {
    const wait = waitUntil(async () => false, { timeoutMs: 20, intervalMs: 5, what: 'the worker' });
    await expect(wait).rejects.toThrow('timed out after 20 ms waiting for the worker');
  });
});
