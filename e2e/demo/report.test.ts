import { describe, expect, it } from 'vitest';
import { exitCode, formatReport } from './report';
import type { Check } from './types';

const ok: Check = { name: 'fine', ok: true, detail: 'all good' };
const bad: Check = { name: 'broken', ok: false, detail: 'expected 1, got 2' };

describe('formatReport', () => {
  it('marks passes and failures and shows detail for failures only', () => {
    const text = formatReport([{ title: 'Session A', checks: [ok, bad] }], []);
    expect(text).toContain('✓ fine');
    expect(text).toContain('✗ broken: expected 1, got 2');
    expect(text).not.toContain('all good');
  });

  it('summarises the totals', () => {
    expect(formatReport([{ title: 'X', checks: [ok, bad] }], [])).toContain('1 passed, 1 failed');
  });

  it('lists observations in their own section', () => {
    const text = formatReport([], ['timeline is always empty']);
    expect(text).toContain('Observations');
    expect(text).toContain('- timeline is always empty');
  });
});

describe('exitCode', () => {
  it('is non-zero when any check fails', () => {
    expect(exitCode([{ title: 'X', checks: [ok, bad] }])).toBe(1);
    expect(exitCode([{ title: 'X', checks: [ok] }])).toBe(0);
  });
});
