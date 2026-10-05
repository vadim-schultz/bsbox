import { TextLink } from '../../../../components';
import { Button } from '@fluentui/react-components';
import { useLocale } from '../../../../i18n';
import type { ComposeState, SyncState } from '../../types';

export interface ComposeViewProps {
  state: ComposeState;
  sync: SyncState;
  onAdd: () => void;
  onSync: () => void;
  onCopy: (url: string) => void;
  copied: boolean;
}

export function ComposeView({ state, sync, onAdd, onSync, onCopy, copied }: ComposeViewProps) {
  const { t } = useLocale();
  if (state.status === 'added') {
    return (
      <section>
        <h1>{t('host.compose.title')}</h1>
        <p>{t('host.compose.added')}</p>
        <p>
          {t('host.compose.link')}: <TextLink href={state.joinUrl}>{state.joinUrl}</TextLink>
        </p>
        <Button onClick={() => onCopy(state.joinUrl)}>{t('host.compose.copy')}</Button>
        <Button onClick={onSync} disabled={sync === 'syncing'}>
          {t(sync === 'syncing' ? 'host.compose.syncing' : 'host.compose.sync')}
        </Button>
        <p role="status">
          {copied ? t('host.compose.copied') : null}
          {sync === 'synced' ? t('host.compose.synced') : null}
          {sync === 'error' ? t('host.compose.error.sync') : null}
        </p>
      </section>
    );
  }
  const adding = state.status === 'adding';
  return (
    <section>
      <h1>{t('host.compose.title')}</h1>
      <p>{t('host.compose.intro')}</p>
      {state.status === 'error' ? <p role="alert">{t('host.compose.error.create')}</p> : null}
      <Button appearance="primary" onClick={onAdd} disabled={adding}>
        {t(adding ? 'host.compose.adding' : 'host.compose.add')}
      </Button>
    </section>
  );
}
