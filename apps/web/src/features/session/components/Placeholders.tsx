import { useLocale } from '../../../i18n';

export function ResultPlaceholder() {
  const { t } = useLocale();
  return <p>{t('session.ended')}</p>;
}
