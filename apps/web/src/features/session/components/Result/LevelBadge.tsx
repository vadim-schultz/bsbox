import type { SessionResult } from '@bsbox/shared';
import { tokens } from '@fluentui/react-components';
import { useLocale } from '../../../../i18n';

// Text + icon + colour so the level never relies on colour alone. Theme tokens keep the text
// contrast compliant in light, dark and high contrast.
const STYLE = {
  high: { icon: '▲', color: tokens.colorPaletteBlueForeground2 },
  healthy: { icon: '●', color: tokens.colorPaletteGreenForeground1 },
  passive: { icon: '◆', color: tokens.colorPaletteDarkOrangeForeground1 },
  low: { icon: '▼', color: tokens.colorPaletteRedForeground1 },
} as const satisfies Record<SessionResult['level'], { icon: string; color: string }>;

export function LevelBadge({ level }: { level: SessionResult['level'] }) {
  const { t } = useLocale();
  const { icon, color } = STYLE[level];
  return (
    <p data-testid="level-badge" style={{ color }}>
      <span aria-hidden="true">{icon} </span>
      <span>{t(`result.level.${level}`)}</span>
    </p>
  );
}
