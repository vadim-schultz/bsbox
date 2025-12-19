/**
 * Build a WebSocket URL from a path.
 * Uses the current page's host and protocol for compatibility with Vite proxy.
 */
export const buildWebSocketUrl = (path: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  return `${protocol}://${host}${path}`;
};
