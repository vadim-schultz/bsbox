import { useEffect, useState } from 'react';
import { useLocale } from '../../../i18n';
import { configureTeamsTab } from '../services';

/** Tab configuration page: registers the side panel content URL with Teams. */
export function TeamsConfig() {
  const { t } = useLocale();
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    void configureTeamsTab(`${location.origin}/host/teams?host=teams`).then(setOk);
  }, []);
  if (ok === false) return <p role="alert">{t('host.teams.outside.body')}</p>;
  return <p>{t('host.teams.config')}</p>;
}
