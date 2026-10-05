import { attempt, expectEqual } from './attempt';
import { post } from './api';
import type { Check } from './types';

const nowS = (): number => Math.floor(Date.now() / 1000);
const valid = () => ({ start: nowS() + 3600, durationMin: 30, tz: 'UTC', source: 'web' });
const json = async <T>(res: Response): Promise<T> => (await res.json()) as T;

async function expectStatus(res: Response, want: number, code?: string): Promise<void> {
  expectEqual('status', want, res.status);
  if (code) expectEqual('problem code', code, (await json<{ code: string }>(res)).code);
}

const patch = (api: string, code: string, token: string | undefined, body: object) =>
  fetch(`${api}/api/series/${code}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-edit-token': token } : {}) },
    body: JSON.stringify(body),
  });

interface Created {
  code: string;
  editToken?: string;
}

async function createAndPatch(api: string): Promise<Check[]> {
  const externalKey = `demo-${Date.now()}`;
  const first = await post(api, { ...valid(), title: 'Sweep', externalKey });
  const again = await post(api, { ...valid(), externalKey });
  const { code, editToken = '' } = await json<Created>(first);
  const status = (res: Promise<Response>, want: number, c?: string) => async () =>
    expectStatus(await res, want, c);
  return [
    await attempt('create -> 201 with editToken', async () => {
      expectEqual('status', 201, first.status);
      expectEqual('editToken present', true, editToken.length > 0);
    }),
    await attempt('same externalKey -> 200 without token', async () => {
      expectEqual('status', 200, again.status);
      expectEqual('editToken', undefined, (await json<Created>(again)).editToken);
    }),
    await attempt(
      'PATCH with token -> 200',
      status(patch(api, code, editToken, { title: 'New' }), 200),
    ),
    await attempt(
      'PATCH without token -> 401',
      status(patch(api, code, undefined, {}), 401, 'missing_edit_token'),
    ),
    await attempt(
      'PATCH wrong token -> 403',
      status(patch(api, code, 'nope', {}), 403, 'invalid_edit_token'),
    ),
    await attempt(
      'PATCH invalid tz -> 422',
      status(patch(api, code, editToken, { tz: 'Mars/Base' }), 422),
    ),
  ];
}

const rejected = (api: string, name: string, over: object) =>
  attempt(name, async () => expectStatus(await post(api, { ...valid(), ...over }), 422));

async function validation(api: string): Promise<Check[]> {
  return [
    await rejected(api, 'invalid rrule -> 422', { rrule: 'NOT A RULE' }),
    await rejected(api, 'durationMin 4 -> 422', { durationMin: 4 }),
    await rejected(api, 'durationMin 481 -> 422', { durationMin: 481 }),
  ];
}

async function lookups(api: string): Promise<Check[]> {
  const past = await post(api, { ...valid(), start: nowS() - 86_400, durationMin: 5 });
  const { code } = await json<Created>(past);
  const get = (path: string) => fetch(`${api}${path}`);
  return [
    await attempt('unknown series -> 404', async () =>
      expectStatus(await get('/api/series/NOSUCHCODE1'), 404, 'series_not_found'),
    ),
    await attempt('unknown session -> 404', async () =>
      expectStatus(await get(`/api/sessions/NOSUCHCODE1-${nowS()}`), 404, 'session_not_found'),
    ),
    await attempt('expired one-off slot -> 410 on first GET', async () =>
      expectStatus(await get(`/api/series/${code}`), 410, 'expired'),
    ),
  ];
}

/** REST sweep over series: create, idempotency, PATCH auth, validation and lookups. */
export async function seriesChecks(api: string): Promise<Check[]> {
  return [...(await createAndPatch(api)), ...(await validation(api)), ...(await lookups(api))];
}
