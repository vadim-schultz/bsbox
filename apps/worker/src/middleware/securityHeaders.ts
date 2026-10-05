import type { MiddlewareHandler } from 'hono';

/** Microsoft script origins required by Office.js and teams-js. */
const MS_SCRIPTS = ['https://appsforoffice.microsoft.com', 'https://res.cdn.office.net'];
const HOST_FRAMES = [
  'https://outlook.office.com',
  'https://outlook.office365.com',
  'https://outlook.live.com',
  'https://teams.microsoft.com',
  'https://*.teams.microsoft.com',
];

const isHostRoute = (path: string): boolean => path === '/host' || path.startsWith('/host/');

export function contentSecurityPolicy(path: string): string {
  const host = isHostRoute(path);
  return [
    "default-src 'self'",
    `script-src 'self' ${MS_SCRIPTS.join(' ')}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self' wss:",
    "object-src 'none'",
    "base-uri 'none'",
    `frame-ancestors ${host ? HOST_FRAMES.join(' ') : "'none'"}`,
  ].join('; ');
}

/** Sets strict security headers on every response; framing is allowed only on host routes. */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  if (c.res.status === 101) return; // WebSocket upgrade: headers are immutable and unused
  const h = new Headers(c.res.headers);
  h.set('content-security-policy', contentSecurityPolicy(new URL(c.req.url).pathname));
  h.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  h.set('x-content-type-options', 'nosniff');
  h.set('referrer-policy', 'strict-origin-when-cross-origin');
  c.res = new Response(c.res.body, {
    status: c.res.status,
    statusText: c.res.statusText,
    headers: h,
  });
};
