import { useLocale } from '../../../i18n';

export function LivePlaceholder() {
  const { t } = useLocale();
  return <p>{t('session.live')}</p>;
}

export function ResultPlaceholder() {
  const { t } = useLocale();
  return <p>{t('session.ended')}</p>;
}
