export interface PollOptions {
  timeoutMs: number;
  intervalMs: number;
  what: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ready(probe: () => Promise<boolean>): Promise<boolean> {
  try {
    return await probe();
  } catch {
    return false;
  }
}

/** Polls until the probe is true; a throwing probe counts as "not yet". */
export async function waitUntil(probe: () => Promise<boolean>, o: PollOptions): Promise<void> {
  const deadline = Date.now() + o.timeoutMs;
  while (!(await ready(probe))) {
    if (Date.now() >= deadline) {
      throw new Error(`timed out after ${o.timeoutMs} ms waiting for ${o.what}`);
    }
    await sleep(o.intervalMs);
  }
}
