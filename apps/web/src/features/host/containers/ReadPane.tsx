import { History } from '../../series';
import { ReadView } from '../components';
import { useStoredSeries } from '../hooks';

export function ReadPane() {
  const state = useStoredSeries();
  return <ReadView state={state} history={(code) => <History code={code} />} />;
}
