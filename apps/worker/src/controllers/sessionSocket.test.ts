import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { createSessionsRepo } from '../repos';
import { seedSeries } from '../repos/testSeed';
import { euRoom } from './sessionSocket';

const app = createApp({
  roomFor: (e, id) => e.SESSION_ROOM.get(e.SESSION_ROOM.idFromName(id)),
});
const call = (path: string, headers: Record<string, string> = {}) =>
  app.request(`https://bsbox.test${path}`, { headers }, env);

describe('session socket controller', () => {
  it('rejects malformed ids, unknown sessions and non-upgrade requests', async () => {
    expect((await call('/api/sessions/bad id!/ws', { upgrade: 'websocket' })).status).toBe(404);
    expect((await call('/api/sessions/NOPE-1/ws', { upgrade: 'websocket' })).status).toBe(404);
    await seedSeries(env.DB, 'WSSERIES01');
    const start = Math.floor(Date.now() / 1000) - 60;
    await createSessionsRepo(env.DB).upsertScheduled({
      id: `WSSERIES01-${start}`,
      seriesCode: 'WSSERIES01',
      startTs: start,
      endTs: start + 1800,
    });
    expect((await call(`/api/sessions/WSSERIES01-${start}/ws`)).status).toBe(400);
  });

  it('upgrades and serves hello over a real WebSocket', async () => {
    await seedSeries(env.DB, 'WSSERIES02');
    const start = Math.floor(Date.now() / 1000) - 60;
    const id = `WSSERIES02-${start}`;
    await createSessionsRepo(env.DB).upsertScheduled({
      id,
      seriesCode: 'WSSERIES02',
      startTs: start,
      endTs: start + 1800,
    });
    const res = await call(`/api/sessions/${id}/ws`, { upgrade: 'websocket' });
    expect(res.status).toBe(101);
    const ws = res.webSocket!;
    ws.accept();
    const next = () =>
      new Promise<{ type: string; session?: { state: string } }>((resolve) =>
        ws.addEventListener('message', (e) => resolve(JSON.parse(e.data as string)), {
          once: true,
        }),
      );
    let p = next();
    ws.send('{"type":"hello"}');
    const welcome = await p;
    expect(welcome.type).toBe('welcome');
    expect(welcome.session?.state).toBe('live');
    p = next();
    ws.send('garbage');
    expect((await p).type).toBe('error');
    p = next();
    ws.send('{"type":"vote","status":"engaged"}');
    ws.send('{"type":"hello","token":"bad"}');
    expect(await p).toMatchObject({ type: 'error', code: 'bad_token' });
    ws.close();
  });
});

describe('euRoom', () => {
  const fakeNs = (calls: string[]) =>
    ({
      jurisdiction: (j: string) => {
        calls.push(j);
        return fakeNs(calls);
      },
      idFromName: (n: string) => n,
      get: () => ({}),
    }) as unknown as DurableObjectNamespace;

  it('pins production rooms to the eu jurisdiction', () => {
    const calls: string[] = [];
    euRoom({ ...env, SESSION_ROOM: fakeNs(calls), ENVIRONMENT: 'production' }, 'A-1');
    expect(calls).toEqual(['eu']);
  });

  it('skips the jurisdiction only when ENVIRONMENT is test (local workerd has none)', () => {
    const calls: string[] = [];
    euRoom({ ...env, SESSION_ROOM: fakeNs(calls), ENVIRONMENT: 'test' }, 'A-1');
    expect(calls).toEqual([]);
  });
});
