/**
 * Hook for countdown timer with time drift detection.
 *
 * Calculates remaining time until meeting starts, accounting for potential
 * drift between browser and server clocks.
 */

import { useEffect, useState, useRef } from "react";

type CountdownResult = {
  /** Remaining seconds until meeting starts (can be negative if passed) */
  remainingSeconds: number;
  /** Time drift in milliseconds (browser - server) */
  driftMs: number;
  /** Whether countdown has completed */
  isComplete: boolean;
};

/**
 * Calculate countdown to meeting start with drift correction.
 *
 * @param startTimeIso - Meeting start time in UTC ISO format
 * @param serverTimeIso - Server's current time in UTC ISO format (for drift detection)
 * @returns Countdown state with remaining seconds and drift
 */
export function useCountdownTimer(
  startTimeIso: string | null,
  serverTimeIso: string | null
): CountdownResult {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [driftMs, setDriftMs] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startTimeIso || !serverTimeIso) {
      setRemainingSeconds(0);
      setDriftMs(0);
      setIsComplete(false);
      return;
    }

    // Parse timestamps
    const startTime = new Date(startTimeIso).getTime();
    const serverTime = new Date(serverTimeIso).getTime();
    const browserTime = Date.now();

    // Calculate drift: positive means browser is ahead of server
    const drift = browserTime - serverTime;
    setDriftMs(drift);

    // Update countdown every 100ms for smooth animation
    const updateCountdown = () => {
      const now = Date.now();
      // Use drift-corrected time for accurate countdown
      const remaining = startTime - (now - drift);
      const remainingSec = Math.floor(remaining / 1000);

      setRemainingSeconds(Math.max(0, remainingSec));

      if (remainingSec <= 0) {
        setIsComplete(true);
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // Initial update
    updateCountdown();

    // Set up interval
    intervalRef.current = window.setInterval(updateCountdown, 100);

    // Cleanup
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTimeIso, serverTimeIso]);

  return {
    remainingSeconds,
    driftMs,
    isComplete,
  };
}

