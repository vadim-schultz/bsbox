import { createSeriesRequestSchema, patchSeriesRequestSchema } from '@bsbox/shared';
import { Hono } from 'hono';
import type { ZodType } from 'zod';
import type { Env } from '../env';
import { ProblemError } from '../middleware/problem';
import { rateLimit } from '../middleware/rateLimit';
import type { SeriesService } from '../services/seriesService';

export interface SeriesVars {
  seriesService: SeriesService;
}

async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ProblemError(400, 'bad_request', 'body is not valid JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ProblemError(422, 'validation_failed', detail);
  }
  return parsed.data;
}

export const seriesController = new Hono<{ Bindings: Env; Variables: SeriesVars }>()
  .post('/series', rateLimit(), async (c) => {
    const body = await parseBody(c.req.raw, createSeriesRequestSchema);
    const result = await c.get('seriesService').create(body);
    const joinUrl = `${new URL(c.req.url).origin}/m/${result.code}`;
    if (!result.created) return c.json({ code: result.code, joinUrl }, 200);
    return c.json({ code: result.code, joinUrl, editToken: result.editToken }, 201);
  })
  .get('/series/:code', async (c) => c.json(await c.get('seriesService').get(c.req.param('code'))))
  .patch('/series/:code', async (c) => {
    const body = await parseBody(c.req.raw, patchSeriesRequestSchema);
    const view = await c
      .get('seriesService')
      .patch(c.req.param('code'), c.req.header('X-Edit-Token'), body);
    return c.json(view);
  });
