import type { SessionResult } from '@bsbox/shared';
import { formatNumber, formatPercent, useLocale } from '../../../../i18n';

export function Stats({ result }: { result: SessionResult }) {
  const { t, locale } = useLocale();
  return (
    <dl>
      <dt>{t('result.stats.peak')}</dt>
      <dd>{formatNumber(result.peak, locale)}</dd>
      <dt>{t('result.stats.participation')}</dt>
      <dd>{formatPercent(result.participationRate, locale)}</dd>
    </dl>
  );
}
