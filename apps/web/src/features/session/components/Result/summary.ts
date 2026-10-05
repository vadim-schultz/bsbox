import type { SessionResult } from '@bsbox/shared';
import { formatDate, formatNumber, formatPercent, translate, type Locale } from '../../../../i18n';

export interface SummaryInput {
  title: string;
  /** Session start, epoch seconds. */
  start: number;
  result: SessionResult;
}

/** Localized plain-text summary using the active locale's number and date formats. */
export function buildSummary({ title, start, result }: SummaryInput, locale: Locale): string {
  return translate(locale, 'result.share.summary', {
    title,
    date: formatDate(new Date(start * 1000), locale),
    score: formatPercent(Math.round(result.score * 100) / 100, locale),
    level: translate(locale, `result.level.${result.level}`),
    peak: formatNumber(result.peak, locale),
    rate: formatPercent(result.participationRate, locale),
  });
}
