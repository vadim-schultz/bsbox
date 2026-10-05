import type { SessionResult } from '@bsbox/shared';
import { useLocale } from '../../../../i18n';
import { isEmptyResult } from '../../utils';
import { LevelBadge } from './LevelBadge';
import { Moments } from './Moments';
import { ScoreRing } from './ScoreRing';
import { ShareActions } from './ShareActions';
import { Stats } from './Stats';
import { Timeline } from './Timeline';
import { buildSummary } from './summary';

export interface ResultProps {
  title: string | null;
  start: number;
  result: SessionResult;
  link: string;
}

export function Result({ title, start, result, link }: ResultProps) {
  const { t, locale } = useLocale();
  const name = title ?? t('lobby.untitled');
  if (isEmptyResult(result)) {
    return (
      <section>
        <h1>{name}</h1>
        <h2>{t('result.empty.title')}</h2>
        <p>{t('result.empty.body')}</p>
      </section>
    );
  }
  return (
    <section>
      <h1>{name}</h1>
      <ScoreRing score={result.score} />
      <LevelBadge level={result.level} />
      <Stats result={result} />
      <Moments minutes={result.minutes} />
      <Timeline minutes={result.minutes} />
      <ShareActions summary={buildSummary({ title: name, start, result }, locale)} link={link} />
    </section>
  );
}
