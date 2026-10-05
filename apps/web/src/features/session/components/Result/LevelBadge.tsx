import type { SessionResult } from '@bsbox/shared';
import { useLocale } from '../../../../i18n';

// Text + icon + colour so the level never relies on colour alone.
const STYLE = {
  high: { icon: '▲', color: '#0072b2' },
  healthy: { icon: '●', color: '#009e73' },
  passive: { icon: '◆', color: '#b36b00' },
  low: { icon: '▼', color: '#c0392b' },
} as const satisfies Record<SessionResult['level'], { icon: string; color: string }>;

export function LevelBadge({ level }: { level: SessionResult['level'] }) {
  const { t } = useLocale();
  const { icon, color } = STYLE[level];
  return (
    <p style={{ color }}>
      <span aria-hidden="true">{icon} </span>
      <span>{t(`result.level.${level}`)}</span>
    </p>
  );
}
