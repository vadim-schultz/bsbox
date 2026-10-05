import { useEffect, useState } from 'react';

/** Server-aligned "now" in ms, refreshed every second. */
export function useServerNow(offsetMs: number): number {
  const [device, setDevice] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setDevice(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return device + offsetMs;
}
