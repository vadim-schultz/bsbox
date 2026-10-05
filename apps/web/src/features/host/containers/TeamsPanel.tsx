import { FluentProvider } from '@fluentui/react-components';
import { LocaleProvider, useLocale } from '../../../i18n';
import { mapTeamsTheme, themes } from '../../../theme';
import { SessionContainer } from '../../session';
import { ErrorState } from '../../shell/components';
import { ShareLink } from '../components';
import { useTeamsPanel } from '../hooks';
import type { TeamsPanelState } from '../types';

function PanelBody({ state }: { state: TeamsPanelState }) {
  const { t } = useLocale();
  if (state.status === 'loading') return <p aria-busy="true">{t('host.teams.loading')}</p>;
  if (state.status === 'outside') {
    return <ErrorState title={t('host.teams.outside.title')} body={t('host.teams.outside.body')} />;
  }
  if (state.status === 'error') {
    return <ErrorState title={t('host.teams.error.title')} body={t('host.teams.error.body')} />;
  }
  return (
    <>
      <SessionContainer code={state.code} />
      <ShareLink joinUrl={state.joinUrl} />
    </>
  );
}

/** Teams meeting side panel: theme and locale follow the Teams context. */
export function TeamsPanel() {
  const { state, theme } = useTeamsPanel();
  const locale = state.status === 'ready' ? state.host.context.locale : undefined;
  return (
    <LocaleProvider key={locale ?? 'none'} host={locale}>
      <FluentProvider theme={themes[mapTeamsTheme(theme)]}>
        <PanelBody state={state} />
      </FluentProvider>
    </LocaleProvider>
  );
}
