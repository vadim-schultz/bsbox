import { Hono } from 'hono';
import { healthController } from './controllers/health';
import { createSessionSocketController, type RoomResolver } from './controllers/sessionSocket';
import { seriesController, type SeriesVars } from './controllers/series';
import { sessionsController, type SessionsVars } from './controllers/sessions';
import type { Env } from './env';
import { logEvent, recordMetric } from './observability';
import { notFoundProblem, onProblem } from './middleware/problem';
import { securityHeaders } from './middleware/securityHeaders';
import { createMinutesRepo, createSeriesRepo, createSessionsRepo } from './repos';
import { clockFor } from './testClock';
import { createSeriesService } from './services/seriesService';
import { createSessionsService } from './services/sessionsService';

export interface AppOptions {
  /** Epoch-seconds clock; injectable for tests. */
  now?: () => number;
  /** Overrides the Durable Object lookup (workerd local mode has no jurisdictions). */
  roomFor?: RoomResolver;
}

export function createApp(opts: AppOptions = {}) {
  const app = new Hono<{ Bindings: Env; Variables: SeriesVars & SessionsVars }>();
  app.use('*', securityHeaders);
  app.use('/api/*', async (c, next) => {
    const started = Date.now();
    await next();
    const code = String(c.res.status);
    logEvent({ event: 'api_request', code, durationMs: Date.now() - started, url: c.req.url });
    if (c.res.status >= 400) recordMetric(c.env, 'error', code);
  });
  app.use('/api/*', async (c, next) => {
    const now = clockFor(c.env, c.req.url, opts.now);
    c.set(
      'seriesService',
      createSeriesService({
        series: createSeriesRepo(c.env.DB),
        sessions: createSessionsRepo(c.env.DB),
        now,
      }),
    );
    c.set(
      'sessionsService',
      createSessionsService({
        series: createSeriesRepo(c.env.DB),
        sessions: createSessionsRepo(c.env.DB),
        minutes: createMinutesRepo(c.env.DB),
        now,
      }),
    );
    await next();
  });
  app.route('/api', healthController);
  app.route('/api', seriesController);
  app.route('/api', sessionsController);
  app.route('/api', createSessionSocketController(opts.roomFor));
  // /api/* never falls through to static assets; everything else is the SPA or docs.
  app.all('/api/*', () => notFoundProblem());
  app.all('*', (c) => (c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : notFoundProblem()));
  app.onError(onProblem);
  app.notFound(() => notFoundProblem());
  return app;
}
