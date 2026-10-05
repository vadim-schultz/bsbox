import { Hono } from 'hono';
import { H_SESSION_END, H_SESSION_ID, H_SESSION_START } from '../do/SessionRoom';
import type { Env } from '../env';
import { ProblemError } from '../middleware/problem';
import { createSessionsRepo } from '../repos';

const SESSION_ID = /^[0-9A-Za-z]+-\d+$/;

export type RoomResolver = (env: Env, sessionId: string) => DurableObjectStub;

/** Production resolver: one room per session, pinned to the EU jurisdiction (D8). */
export const euRoom: RoomResolver = (env, id) => {
  const ns = env.SESSION_ROOM.jurisdiction('eu');
  return ns.get(ns.idFromName(id));
};

/** Validates the session and forwards the upgrade to its Durable Object. */
export const createSessionSocketController = (roomFor: RoomResolver = euRoom) =>
  new Hono<{ Bindings: Env }>().get('/sessions/:id/ws', async (c) => {
    const id = c.req.param('id');
    if (!SESSION_ID.test(id)) throw new ProblemError(404, 'not_found');
    if (c.req.header('upgrade') !== 'websocket') {
      throw new ProblemError(400, 'bad_request', 'expected a WebSocket upgrade');
    }
    const session = await createSessionsRepo(c.env.DB).getById(id);
    if (!session) throw new ProblemError(404, 'not_found');
    const headers = new Headers(c.req.raw.headers);
    headers.set(H_SESSION_ID, id);
    headers.set(H_SESSION_START, String(session.startTs));
    headers.set(H_SESSION_END, String(session.endTs));
    return roomFor(c.env, id).fetch(new Request(c.req.raw, { headers }));
  });
