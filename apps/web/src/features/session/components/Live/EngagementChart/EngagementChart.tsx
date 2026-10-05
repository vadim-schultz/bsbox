import { area, line } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { useLocale } from '../../../../../i18n';
import type { ChartPoint } from '../../../utils';

const W = 600;
const H = 200;
// Okabe-Ito pair: distinguishable under common colour-vision deficiencies.
const ENGAGED = '#0072b2';
const NOT_ENGAGED = '#e69f00';

export interface EngagementChartProps {
  points: readonly ChartPoint[];
  totalMinutes: number;
  /** Show the "now" marker; off for finished sessions. */
  showNow?: boolean;
}

/** Stacked share of engaged vs. not engaged, smoothed overall line, now marker, empty future. */
export function EngagementChart({ points, totalMinutes, showNow = true }: EngagementChartProps) {
  const { t } = useLocale();
  const x = scaleLinear()
    .domain([0, Math.max(1, totalMinutes - 1)])
    .range([0, W]);
  const y = scaleLinear().domain([0, 1]).range([H, 0]);
  const px = (p: ChartPoint) => x(p.minuteIdx);
  const engaged = area<ChartPoint>()
    .x(px)
    .y0(H)
    .y1((p) => y(p.share))(points as ChartPoint[]);
  const notEngaged = area<ChartPoint>()
    .x(px)
    .y0((p) => y(p.share))
    .y1(0)(points as ChartPoint[]);
  const overall = line<ChartPoint>()
    .x(px)
    .y((p) => y(p.line))(points as ChartPoint[]);
  const last = points.at(-1);

  return (
    <figure>
      <svg
        data-testid="chart"
        className="bsbox-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('live.chart.label')}
      >
        <path d={notEngaged ?? ''} fill={NOT_ENGAGED} fillOpacity={0.5} />
        <path d={engaged ?? ''} fill={ENGAGED} fillOpacity={0.6} />
        <path d={overall ?? ''} fill="none" stroke="currentColor" strokeWidth={3} />
        {last && showNow ? (
          <g>
            <line
              x1={px(last)}
              x2={px(last)}
              y1={0}
              y2={H}
              stroke="currentColor"
              strokeDasharray="4 4"
            />
            <text x={px(last)} y={12} fontSize={12} textAnchor="end" fill="currentColor">
              {t('live.chart.now')}
            </text>
          </g>
        ) : null}
      </svg>
      <ul className="bsbox-legend">
        <li>
          <span aria-hidden="true" style={{ color: ENGAGED }}>
            ■{' '}
          </span>
          {t('live.legend.engaged')}
        </li>
        <li>
          <span aria-hidden="true" style={{ color: NOT_ENGAGED }}>
            ▲{' '}
          </span>
          {t('live.legend.notEngaged')}
        </li>
        <li>
          <span aria-hidden="true">━ </span>
          {t('live.legend.overall')}
        </li>
      </ul>
    </figure>
  );
}
