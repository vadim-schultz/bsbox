import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API = `http://localhost:${process.env.E2E_API_PORT ?? 8788}`;

const nowS = () => Math.floor(Date.now() / 1000);

export interface Meeting {
  code: string;
}

/** Creates a series whose first session started `startedAgoS` seconds ago. */
export async function createMeeting(
  request: APIRequestContext,
  opts: { startedAgoS: number; durationMin: number; title?: string },
): Promise<Meeting> {
  const res = await request.post(`${API}/api/series`, {
    data: {
      start: nowS() - opts.startedAgoS,
      durationMin: opts.durationMin,
      tz: 'UTC',
      source: 'web',
      title: opts.title ?? 'E2E meeting',
    },
  });
  expect(res.status()).toBe(201);
  return { code: ((await res.json()) as { code: string }).code };
}

/** A live session that stays live for the whole run. */
export const createLiveMeeting = (request: APIRequestContext) =>
  createMeeting(request, { startedAgoS: 30, durationMin: 120, title: 'Live meeting' });

/** A session that has not started yet. */
export const createLobbyMeeting = (request: APIRequestContext) =>
  createMeeting(request, { startedAgoS: -3600, durationMin: 30, title: 'Lobby meeting' });

/** A session that ends in about `inS` seconds (the minimum duration is 5 minutes). */
export const createEndingMeeting = (request: APIRequestContext, inS: number) =>
  createMeeting(request, { startedAgoS: 300 - inS, durationMin: 5, title: 'Ending meeting' });

export interface Row {
  present: number;
  engaged: number;
}

/** Last row of the accessible chart table (the visually hidden twin of the chart). */
export async function lastRow(page: Page): Promise<Row | null> {
  const cells = page.locator('table tbody tr:last-child td');
  if ((await cells.count()) < 2) return null;
  return {
    present: Number(await cells.nth(0).textContent()),
    engaged: Number(await cells.nth(1).textContent()),
  };
}

export interface Outcome {
  score: string;
  level: string;
}

export async function readOutcome(page: Page): Promise<Outcome> {
  const ring = page.getByTestId('score-ring');
  await expect(ring).toBeVisible();
  return {
    score: ((await ring.locator('.bsbox-sr-only').textContent()) ?? '').trim(),
    level: ((await page.getByTestId('level-badge').textContent()) ?? '').replace(/^\W+/, '').trim(),
  };
}
