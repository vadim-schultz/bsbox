import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const read = () => typeof matchMedia === 'function' && matchMedia(QUERY).matches;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(read);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
