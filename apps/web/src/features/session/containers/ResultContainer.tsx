import type { SessionResult } from '@bsbox/shared';
import { useLocale } from '../../../i18n';
import { ErrorState } from '../../shell/components';
import { Result } from '../components';
import { useResult } from '../hooks';

export interface ResultContainerProps {
  sessionId: string;
  title: string | null;
  start: number;
  /** Result pushed by the socket's `ended` message, if any. */
  result: SessionResult | null;
}

export function ResultContainer({ sessionId, title, start, result }: ResultContainerProps) {
  const { t } = useLocale();
  const state = useResult(sessionId, result);
  if (state.status === 'loading') return <p aria-busy="true">{t('session.loading')}</p>;
  if (state.status === 'error') {
    return state.kind === 'expired' ? (
      <ErrorState title={t('error.session_expired.title')} body={t('error.session_expired.body')} />
    ) : (
      <ErrorState title={t('error.internal.title')} body={t('error.internal.body')} />
    );
  }
  return <Result title={title} start={start} result={state.result} link={window.location.href} />;
}
