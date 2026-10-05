import { useLocale } from '../../../../i18n';
import type { ReadState } from '../../types';
import type { ReactNode } from 'react';

/** `history` is injected by the container so this component stays free of services. */
export function ReadView({
  state,
  history,
}: {
  state: ReadState;
  history: (code: string) => ReactNode;
}) {
  const { t } = useLocale();
  return (
    <section>
      <h1>{t('host.read.title')}</h1>
      {state.status === 'unavailable' ? <p role="alert">{t('host.unavailable')}</p> : null}
      {state.status === 'none' ? <p>{t('host.read.none')}</p> : null}
      {state.status === 'found' ? (
        <>
          <p>
            <a href={state.joinUrl}>{t('host.read.open')}</a>
          </p>
          {history(state.code)}
        </>
      ) : null}
    </section>
  );
}
