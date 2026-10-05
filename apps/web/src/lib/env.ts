/** Same-origin API base; the Vite dev server proxies /api to wrangler dev. */
export const API_BASE = '/api';

export function wsUrl(path: string): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}${API_BASE}${path}`;
}
