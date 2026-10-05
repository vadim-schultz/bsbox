import { useLocale } from '../../../../i18n';
import { Countdown } from './Countdown';
import { DriftWarning } from './DriftWarning';
import { PresenceCount } from './PresenceCount';

export interface LobbyProps {
  title: string | null;
  remainingMs: number;
  drifting: boolean;
  present: number;
}

export function Lobby({ title, remainingMs, drifting, present }: LobbyProps) {
  const { t } = useLocale();
  return (
    <section>
      <h1>{title ?? t('lobby.untitled')}</h1>
      <Countdown remainingMs={remainingMs} />
      {drifting ? <DriftWarning /> : null}
      <PresenceCount count={present} />
    </section>
  );
}
