import type { Browser } from '@playwright/test';

const SETTLE_MS = 10_000;

/** Counts WebSocket attempts of the web client when a stale token is stored for the room. */
export async function staleTokenSockets(
  browser: Browser,
  web: string,
  room: { code: string; sessionId: string },
): Promise<number> {
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    let attempts = 0;
    page.on('websocket', () => void (attempts += 1));
    await page.addInitScript(
      (id) => localStorage.setItem(`bsbox.token.${id}`, 'stale.token'),
      room.sessionId,
    );
    await page.goto(`${web}/m/${room.code}`);
    await page.waitForTimeout(SETTLE_MS);
    return attempts;
  } finally {
    await ctx.close();
  }
}

/** State REST reports for a session after its end. */
export async function stateOf(api: string, sessionId: string): Promise<string> {
  const res = await fetch(`${api}/api/sessions/${sessionId}`);
  return ((await res.json()) as { state: string }).state;
}

/** Whether the first history item of a series carries its result. */
export async function historyHasResult(api: string, code: string): Promise<boolean> {
  const res = await fetch(`${api}/api/sessions?series=${code}`);
  const body = (await res.json()) as { items: { result?: unknown }[] };
  return body.items[0]?.result !== undefined;
}
