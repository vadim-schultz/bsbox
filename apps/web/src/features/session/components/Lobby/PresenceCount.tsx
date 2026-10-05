import { useLocale } from '../../../../i18n';

export function PresenceCount({ count }: { count: number }) {
  const { t } = useLocale();
  return <p aria-live="polite">{t('lobby.present', { count })}</p>;
}
