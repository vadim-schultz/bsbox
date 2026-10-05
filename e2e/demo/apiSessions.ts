import { attempt, expectEqual } from './attempt';
import { post } from './api';
import type { Check } from './types';

const DAY = 86_400;
const nowS = (): number => Math.floor(Date.now() / 1000);

interface Recurring {
  code: string;
  start: number;
}

const getJson = async <T>(url: string): Promise<{ status: number; body: T }> => {
  const res = await fetch(url);
  return { status: res.status, body: (await res.json()) as T };
};

async function createRecurring(api: string): Promise<Recurring> {
  const start = nowS() + 3600;
  const body = { start, durationMin: 30, tz: 'UTC', source: 'web', rrule: 'FREQ=DAILY;COUNT=5' };
  const res = await post(api, body);
  return { code: ((await res.json()) as { code: string }).code, start };
}

async function sessionAt(
  api: string,
  r: Recurring,
  day: number,
): Promise<{ id: string; start: number }> {
  const now = r.start + day * DAY - 60;
  const { body } = await getJson<{ session: { id: string; start: number } }>(
    `${api}/api/series/${r.code}?now=${now}`,
  );
  return body.session;
}

async function hopping(api: string, r: Recurring): Promise<Check> {
  return attempt('recurring series resolves a different occurrence per ?now=', async () => {
    const starts = [
      await sessionAt(api, r, 0),
      await sessionAt(api, r, 1),
      await sessionAt(api, r, 2),
    ];
    expectEqual('distinct starts', 3, new Set(starts.map((s) => s.start)).size);
    expectEqual('day 2 start', r.start + 2 * DAY, starts[2]?.start);
  });
}

async function paging(api: string, r: Recurring): Promise<Check[]> {
  type Page = { items: unknown[]; nextCursor: string | null };
  const list = (q: string) => getJson<Page>(`${api}/api/sessions?series=${r.code}${q}`);
  return [
    await attempt('list limit=2 pages through a cursor', async () => {
      const first = await list('&limit=2');
      expectEqual('first page size', 2, first.body.items.length);
      const second = await list(`&limit=2&cursor=${first.body.nextCursor}`);
      expectEqual('second page size', 1, second.body.items.length);
      expectEqual('last cursor', null, second.body.nextCursor);
    }),
    await attempt('list garbage cursor -> 422 invalid_cursor', async () => {
      const res = await getJson<{ code: string }>(
        `${api}/api/sessions?series=${r.code}&cursor=garbage`,
      );
      expectEqual('status', 422, res.status);
      expectEqual('code', 'invalid_cursor', res.body.code);
    }),
    await attempt('list limit=51 -> 422', async () =>
      expectEqual('status', 422, (await list('&limit=51')).status),
    ),
  ];
}

async function expiry(api: string, r: Recurring): Promise<Check> {
  return attempt('session older than 30 days -> 410', async () => {
    const session = await sessionAt(api, r, 0);
    const late = session.start + 30 * DAY + 30 * 60 + 1;
    const res = await fetch(`${api}/api/sessions/${session.id}?now=${late}`);
    expectEqual('status', 410, res.status);
  });
}

/** REST sweep over sessions: occurrence hopping, paging and retention expiry. */
export async function sessionChecks(api: string): Promise<Check[]> {
  const r = await createRecurring(api);
  return [await hopping(api, r), ...(await paging(api, r)), await expiry(api, r)];
}
