import { Hono } from 'hono';
import type { Env } from '../env';
import type { SessionsService } from '../services/sessionsService';

export interface SessionsVars {
  sessionsService: SessionsService;
}

export const sessionsController = new Hono<{ Bindings: Env; Variables: SessionsVars }>()
  .get('/sessions', async (c) => {
    const q = c.req.query();
    const page = await c.get('sessionsService').list(q.series, q.limit, q.cursor);
    c.header('Cache-Control', 'no-store');
    return c.json(page);
  })
  .get('/sessions/:id', async (c) => {
    const { body, cacheable } = await c.get('sessionsService').get(c.req.param('id'));
    c.header('Cache-Control', cacheable ? 'public, max-age=300' : 'no-store');
    return c.json(body);
  });
