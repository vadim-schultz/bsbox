import { describe, expect, it } from 'vitest';
import { parseFlags } from './flags';

describe('parseFlags', () => {
  it('defaults everything off', () => {
    expect(parseFlags([])).toEqual({ keepRunning: false, headless: false, reuse: false });
  });

  it('reads each flag', () => {
    const f = parseFlags(['--keep-running', '--headless', '--reuse']);
    expect(f).toEqual({ keepRunning: true, headless: true, reuse: true });
  });

  it('ignores the pnpm argument separator', () => {
    expect(parseFlags(['--', '--headless']).headless).toBe(true);
  });

  it('rejects unknown flags with a clear message', () => {
    expect(() => parseFlags(['--nope'])).toThrow('unknown flag --nope');
  });
});
