import { Hono } from 'hono';
import { healthController } from './controllers/health';
import { seriesController, type SeriesVars } from './controllers/series';
import type { Env } from './env';
import { notFoundProblem, onProblem } from './middleware/problem';
import { createSeriesRepo, createSessionsRepo } from './repos';
import { createSeriesService } from './services/seriesService';

export interface AppOptions {
  /** Epoch-seconds clock; injectable for tests. */
  now?: () => number;
}

export function createApp(opts: AppOptions = {}) {
  const app = new Hono<{ Bindings: Env; Variables: SeriesVars }>();
  app.use('/api/*', async (c, next) => {
    c.set(
      'seriesService',
      createSeriesService({
        series: createSeriesRepo(c.env.DB),
        sessions: createSessionsRepo(c.env.DB),
        ...(opts.now && { now: opts.now }),
      }),
    );
    await next();
  });
  app.route('/api', healthController);
  app.route('/api', seriesController);
  app.onError(onProblem);
  app.notFound(() => notFoundProblem());
  return app;
}
