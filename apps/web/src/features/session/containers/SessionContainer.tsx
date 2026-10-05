import type { SeriesResponse } from '@bsbox/shared';
import { useLocale, type StringKey } from '../../../i18n';
import { useSeries, type SeriesErrorKind } from '../../series';
import { ErrorState } from '../../shell/components';
import { Live, Lobby, ResultPlaceholder } from '../components';
import { useLiveSession, useServerNow } from '../hooks';
import { isDrifting } from '../utils';

function SessionView({ series, offsetMs }: { series: SeriesResponse; offsetMs: number }) {
  const live = useLiveSession(series.session);
  const { phase, presence: present } = live;
  const serverNow = useServerNow(offsetMs);
  if (phase === 'live') {
    const { session } = series;
    return (
      <Live
        title={series.title}
        timeline={live.timeline}
        totalMinutes={Math.max(1, Math.ceil((session.end - session.start) / 60))}
        myStatus={live.myStatus}
        connection={live.connection}
        error={live.error}
        onVote={live.vote}
      />
    );
  }
  if (phase === 'ended') return <ResultPlaceholder />;
  return (
    <Lobby
      title={series.title}
      remainingMs={series.session.start * 1000 - serverNow}
      drifting={isDrifting(offsetMs)}
      present={present}
    />
  );
}

const ERROR_KEYS = {
  series_not_found: ['error.series_not_found.title', 'error.series_not_found.body'],
  session_expired: ['error.session_expired.title', 'error.session_expired.body'],
  network: ['error.network.title', 'error.network.body'],
  internal_error: ['error.internal.title', 'error.internal.body'],
} as const satisfies Record<SeriesErrorKind, readonly [StringKey, StringKey]>;

export function SessionContainer({ code }: { code: string }) {
  const { t } = useLocale();
  const { state, retry } = useSeries(code);
  if (state.status === 'loading') return <p aria-busy="true">{t('session.loading')}</p>;
  if (state.status === 'error') {
    const [title, body] = ERROR_KEYS[state.kind];
    const retryable = state.kind === 'network' || state.kind === 'internal_error';
    return <ErrorState title={t(title)} body={t(body)} onRetry={retryable ? retry : undefined} />;
  }
  return <SessionView key={state.data.session.id} series={state.data} offsetMs={state.offsetMs} />;
}
