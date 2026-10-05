import { useLocale } from '../../../../i18n';
import type { ChartPoint } from '../../utils';

/** Visually hidden data table: the accessible twin of the chart. */
export function ChartTable({ points }: { points: readonly ChartPoint[] }) {
  const { t } = useLocale();
  return (
    <table className="bsbox-sr-only">
      <caption>{t('live.table.caption')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('live.table.minute')}</th>
          <th scope="col">{t('live.table.present')}</th>
          <th scope="col">{t('live.table.engaged')}</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.minuteIdx}>
            <th scope="row">{p.minuteIdx + 1}</th>
            <td>{p.present}</td>
            <td>{p.engaged}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
