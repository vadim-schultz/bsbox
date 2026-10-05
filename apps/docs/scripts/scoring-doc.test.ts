import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALPHA, CAP, THRESHOLDS } from '../../../packages/shared/src/scoring.ts';

const doc = readFileSync(new URL('../../../docs/scoring.md', import.meta.url), 'utf8');
const source = readFileSync(
  new URL('../../../packages/shared/src/scoring.ts', import.meta.url),
  'utf8',
);

describe('docs/scoring.md', () => {
  it('states the same constants as packages/shared/src/scoring.ts', () => {
    expect(source).toContain(`ALPHA = ${ALPHA}`);
    expect(doc).toContain(`ALPHA = ${ALPHA}`);
    expect(doc).toContain(`CAP = ${CAP}`);
    expect(doc).toContain(`high >= ${THRESHOLDS.high}`);
    expect(doc).toContain(`healthy >= ${THRESHOLDS.healthy}`);
    expect(doc).toContain(`passive >= ${THRESHOLDS.passive}`);
  });

  it('documents 1-minute buckets and not 15-minute ones', () => {
    expect(doc).toMatch(/1-minute/);
    expect(doc).not.toMatch(/15-minute/);
  });
});
