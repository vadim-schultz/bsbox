import { useLocale } from '../../../../i18n';

export function ReconnectBanner() {
  const { t } = useLocale();
  return (
    <p role="status" className="bsbox-banner">
      {t('live.reconnecting')}
    </p>
  );
}
