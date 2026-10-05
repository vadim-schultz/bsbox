import { describe, expect, it } from 'vitest';
import { attempt, expectEqual } from './attempt';

describe('attempt', () => {
  it('passes with the returned detail', async () => {
    const c = await attempt('works', async () => 'got 201');
    expect(c).toEqual({ name: 'works', ok: true, detail: 'got 201' });
  });

  it('fails with the error message instead of throwing', async () => {
    const c = await attempt('breaks', async () => Promise.reject(new Error('expected 1, got 2')));
    expect(c).toEqual({ name: 'breaks', ok: false, detail: 'expected 1, got 2' });
  });

  it('gives a passing check a default detail', async () => {
    expect((await attempt('quiet', async () => {})).detail).toBe('ok');
  });
});

describe('expectEqual', () => {
  it('throws a readable message on mismatch', () => {
    expect(() => expectEqual('status', 201, 200)).toThrow('status: expected 201, got 200');
    expect(() => expectEqual('status', 201, 201)).not.toThrow();
  });
});
