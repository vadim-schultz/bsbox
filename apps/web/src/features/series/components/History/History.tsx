import { useEffect, useState } from 'react';
import { formatDate, formatPercent, useLocale } from '../../../../i18n';
import { listSessions, type SessionList } from '../../services';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: SessionList };

/** Past sessions of a series, newest first as served. */
export function History({ code }: { code: string }) {
  const { t, locale } = useLocale();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    listSessions(code, controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [code]);

  if (state.status === 'loading') return <p aria-busy="true">{t('history.loading')}</p>;
  if (state.status === 'error') return <p role="alert">{t('history.error')}</p>;
  if (state.data.items.length === 0) return <p>{t('history.empty')}</p>;
  return (
    <section>
      <h2>{t('history.heading')}</h2>
      <ul>
        {state.data.items.map((s) => (
          <li key={s.id}>
            <span>{formatDate(new Date(s.start * 1000), locale)}</span>{' '}
            <span>
              {s.result
                ? formatPercent(Math.round(s.result.score * 100) / 100, locale)
                : t('history.noResult')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
