import { describe, expect, it } from 'vitest';
import { attempt, expectEqual, withTimeout } from './attempt';

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

describe('withTimeout', () => {
  it('rejects a step that outlives its budget', async () => {
    const slow = new Promise((r) => setTimeout(r, 200));
    await expect(withTimeout(slow, 10, 'slow step')).rejects.toThrow(
      'slow step timed out after 10 ms',
    );
  });

  it('passes through a step that finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(5), 100, 'quick')).resolves.toBe(5);
  });
});
