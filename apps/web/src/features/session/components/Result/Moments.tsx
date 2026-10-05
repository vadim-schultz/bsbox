import type { SessionResult } from '@bsbox/shared';
import { formatNumber, formatPercent, useLocale } from '../../../../i18n';
import { findMoments } from '../../utils';

export function Moments({ minutes }: { minutes: SessionResult['minutes'] }) {
  const { t, locale } = useLocale();
  const moments = findMoments(minutes);
  if (!moments) return null;
  const describe = (m: { minuteIdx: number; share: number }) => ({
    minute: formatNumber(m.minuteIdx + 1, locale),
    share: formatPercent(m.share, locale),
  });
  return (
    <ul>
      <li>{t('result.moments.peak', describe(moments.peak))}</li>
      <li>{t('result.moments.low', describe(moments.low))}</li>
    </ul>
  );
}
