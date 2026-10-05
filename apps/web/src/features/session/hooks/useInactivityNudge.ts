import { useCallback, useEffect, useState } from 'react';

export const NUDGE_AFTER_MS = 10 * 60_000;
const DISABLED_KEY = 'bsbox.nudge.disabled';

function isDisabled(): boolean {
  try {
    return localStorage.getItem(DISABLED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Shows a nudge after 10 minutes without a tap; `activity` changes whenever the user votes. */
export function useInactivityNudge(activity: unknown) {
  const [visible, setVisible] = useState(false);
  const [disabled, setDisabled] = useState(isDisabled);

  useEffect(() => {
    setVisible(false);
    if (disabled) return;
    const id = setTimeout(() => setVisible(true), NUDGE_AFTER_MS);
    return () => clearTimeout(id);
  }, [activity, disabled]);

  const dismiss = useCallback(() => setVisible(false), []);
  const disable = useCallback(() => {
    try {
      localStorage.setItem(DISABLED_KEY, '1');
    } catch {
      /* storage blocked; disabled for this visit only */
    }
    setDisabled(true);
    setVisible(false);
  }, []);

  return { visible, dismiss, disable };
}
