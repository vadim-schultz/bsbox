import type { SessionResult } from '@bsbox/shared';
import { useLocale } from '../../../../i18n';
import { buildPoints } from '../../utils';
import { ChartTable } from '../Live/ChartTable';
import { EngagementChart } from '../Live/EngagementChart';

export function Timeline({ minutes }: { minutes: SessionResult['minutes'] }) {
  const { t } = useLocale();
  const points = buildPoints(minutes);
  return (
    <section>
      <h2>{t('result.timeline.heading')}</h2>
      <EngagementChart points={points} totalMinutes={Math.max(1, minutes.length)} showNow={false} />
      <ChartTable points={points} />
    </section>
  );
}
