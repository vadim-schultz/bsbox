import type { VoteStatus } from '@bsbox/shared';
import { useLocale, type StringKey } from '../../../../i18n';
import './live.css';

const CARDS = [
  { status: 'engaged', label: 'live.vote.engaged', icon: '★' },
  { status: 'speaking', label: 'live.vote.speaking', icon: '●' },
] as const satisfies readonly { status: VoteStatus; label: StringKey; icon: string }[];

export interface VoteCardsProps {
  active: VoteStatus;
  onVote: (status: VoteStatus) => void;
  reducedMotion: boolean;
}

export function VoteCards({ active, onVote, reducedMotion }: VoteCardsProps) {
  const { t } = useLocale();
  const tap = (status: VoteStatus) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
    onVote(status);
  };
  return (
    <div role="group" aria-label={t('live.vote.group')} className="bsbox-cards">
      {CARDS.map(({ status, label, icon }) => (
        <button
          key={status}
          type="button"
          aria-pressed={active === status}
          className={reducedMotion ? 'bsbox-card' : 'bsbox-card bsbox-spring'}
          onClick={() => tap(status)}
        >
          <span aria-hidden="true">{icon}</span>
          {t(label)}
        </button>
      ))}
    </div>
  );
}
