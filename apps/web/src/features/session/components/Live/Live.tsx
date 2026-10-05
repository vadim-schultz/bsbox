import type { VoteStatus } from '@bsbox/shared';
import { useLocale } from '../../../../i18n';
import type { Connection } from '../../hooks';
import { useInactivityNudge, usePrefersReducedMotion } from '../../hooks';
import { buildPoints, shareBand, type MinuteSample } from '../../utils';
import { ChartTable } from './ChartTable';
import { EngagementChart } from './EngagementChart';
import { InactivityNudge } from './InactivityNudge';
import { ReconnectBanner } from './ReconnectBanner';
import { VoteCards } from './VoteCards';

export interface LiveProps {
  title: string | null;
  timeline: readonly MinuteSample[];
  totalMinutes: number;
  myStatus: VoteStatus;
  connection: Connection;
  error: string | null;
  onVote: (status: VoteStatus) => void;
}

export function Live(props: LiveProps) {
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const nudge = useInactivityNudge(props.myStatus);
  const points = buildPoints(props.timeline);
  const last = points.at(-1);

  return (
    <section>
      <h1>{props.title ?? t('lobby.untitled')}</h1>
      {props.connection === 'reconnecting' ? <ReconnectBanner /> : null}
      {nudge.visible ? (
        <InactivityNudge onDismiss={nudge.dismiss} onDisable={nudge.disable} />
      ) : null}
      <VoteCards active={props.myStatus} onVote={props.onVote} reducedMotion={reduced} />
      {props.error ? (
        <p role="alert">
          {props.error === 'not_live' ? t('live.error.not_live') : t('live.error.generic')}
        </p>
      ) : null}
      <p aria-live="polite">{last ? t(`live.summary.${shareBand(last.share)}`) : ''}</p>
      <EngagementChart points={points} totalMinutes={props.totalMinutes} />
      <ChartTable points={points} />
    </section>
  );
}
