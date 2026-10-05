import { attempt, withTimeout } from '../attempt';
import type { Check } from '../types';

const STEP_BUDGET_MS = 45_000;

/** A browser step that is bounded in time, so a stuck page is reported instead of hanging. */
export const browserCheck = (
  name: string,
  fn: () => Promise<string | void>,
  ms = STEP_BUDGET_MS,
): Promise<Check> => attempt(name, () => withTimeout(fn(), ms, name));
