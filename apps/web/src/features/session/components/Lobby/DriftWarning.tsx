import { useLocale } from '../../../../i18n';

export function DriftWarning() {
  const { t } = useLocale();
  return <p role="status">{t('lobby.drift')}</p>;
}
