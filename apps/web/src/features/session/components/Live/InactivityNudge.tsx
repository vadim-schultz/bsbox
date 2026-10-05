import { useLocale } from '../../../../i18n';

export interface InactivityNudgeProps {
  onDismiss: () => void;
  onDisable: () => void;
}

export function InactivityNudge({ onDismiss, onDisable }: InactivityNudgeProps) {
  const { t } = useLocale();
  return (
    <div role="status" className="bsbox-nudge">
      <p>{t('live.nudge.text')}</p>
      <button type="button" onClick={onDismiss}>
        {t('live.nudge.dismiss')}
      </button>
      <button type="button" onClick={onDisable}>
        {t('live.nudge.disable')}
      </button>
    </div>
  );
}
