import { useEffect, useState } from 'react';
import { formatPercent, useLocale } from '../../../../i18n';
import { usePrefersReducedMotion } from '../../hooks';

const SIZE = 120;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION_MS = 800;

/** Animates 0 -> target; returns the target at once under reduced motion. */
function useCountUp(target: number, off: boolean): number {
  const [value, setValue] = useState(off ? target : 0);
  useEffect(() => {
    if (off) {
      setValue(target);
      return;
    }
    const begin = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - begin) / DURATION_MS);
      setValue(target * p);
      if (p < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, off]);
  return value;
}

export function ScoreRing({ score }: { score: number }) {
  const { locale } = useLocale();
  const reduced = usePrefersReducedMotion();
  const shown = useCountUp(score, reduced);
  const final = formatPercent(Math.round(score * 100) / 100, locale);
  return (
    <div data-testid="score-ring">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <span className="bsbox-sr-only">{final}</span>
      <strong aria-hidden="true">{formatPercent(Math.round(shown * 100) / 100, locale)}</strong>
    </div>
  );
}
