import { useLocale } from '../../../../i18n';
import { formatCountdown } from '../../utils';

export function Countdown({ remainingMs }: { remainingMs: number }) {
  const { t } = useLocale();
  return (
    <p>
      {t('lobby.startsIn')} <strong data-testid="countdown">{formatCountdown(remainingMs)}</strong>
    </p>
  );
}
