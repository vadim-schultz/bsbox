import type { Check } from './types';

export interface Section {
  title: string;
  checks: Check[];
}

const line = (c: Check): string => (c.ok ? `  ✓ ${c.name}` : `  ✗ ${c.name}: ${c.detail}`);

const sectionText = (s: Section): string => [s.title, ...s.checks.map(line)].join('\n');

const all = (sections: readonly Section[]): Check[] => sections.flatMap((s) => s.checks);

function totals(sections: readonly Section[]): string {
  const failed = all(sections).filter((c) => !c.ok).length;
  return `${all(sections).length - failed} passed, ${failed} failed`;
}

function observationsText(items: readonly string[]): string {
  if (items.length === 0) return '';
  return ['Observations (known gaps, surfaced not fixed)', ...items.map((i) => `- ${i}`)].join(
    '\n',
  );
}

export function formatReport(
  sections: readonly Section[],
  observations: readonly string[],
): string {
  const parts = [...sections.map(sectionText), totals(sections), observationsText(observations)];
  return parts.filter((p) => p !== '').join('\n\n');
}

export const exitCode = (sections: readonly Section[]): 0 | 1 =>
  all(sections).some((c) => !c.ok) ? 1 : 0;
