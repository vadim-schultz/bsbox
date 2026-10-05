import { chromium, type Browser } from '@playwright/test';
import type { SessionResult } from '@bsbox/shared';
import { adversarialChecks } from './adversarial';
import { rateLimitCheck } from './apiRateLimit';
import { seriesChecks } from './apiSeries';
import { sessionChecks } from './apiSessions';
import { createSession, post } from './api';
import { openWindows, type Win } from './browsers/open';
import { liveChecks, lobbyChecks } from './browsers/live';
import { midChecks } from './browsers/mid';
import { pageChecks } from './browsers/pages';
import { resultChecks } from './browsers/result';
import { ticksBeforeLive, welcomeTimelineLen } from './collect';
import { finishRoom } from './finish';
import { parseFlags } from './flags';
import { expectedResult } from './groundTruth';
import { log, sleepUntil } from './log';
import { assertLocalUrl } from './net';
import { observationsFrom, type Evidence } from './observations';
import { observers } from './personas';
import { historyHasResult, staleTokenSockets, stateOf } from './probes';
import { exitCode, formatReport, type Section } from './report';
import { launchRoom, type RoomRun } from './room';
import { scenarios } from './scenarios';
import { startStack, type Stack } from './stack';
import type { Check } from './types';

const nowS = (): number => Math.floor(Date.now() / 1000);

async function launchBrowser(headless: boolean): Promise<Browser | undefined> {
  try {
    return await chromium.launch({ headless });
  } catch (e) {
    log(`browser unavailable: ${(e as Error).message.split('\n')[0]}`);
    return undefined;
  }
}

async function browserPhase(
  run: RoomRun,
  wins: Win[],
  present: (m: number) => number,
): Promise<Check[]> {
  const at = (sec: number) => sleepUntil((run.session.start + sec) * 1000);
  const out = await lobbyChecks(wins);
  await at(90);
  out.push(...(await liveChecks(wins, present(1))));
  await at(3 * 60 + 35);
  out.push(...(await midChecks(wins)));
  return out;
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2));
  const stack: Stack = await startStack(flags);
  const cleanup = () => void stack.stop();
  for (const sig of ['SIGINT', 'SIGTERM'] as const)
    process.once(sig, () => void stack.stop().then(() => process.exit(130)));
  process.once('exit', cleanup);
  let browser: Browser | undefined;
  try {
    assertLocalUrl(stack.apiUrl);
    assertLocalUrl(stack.webUrl);
    browser = await launchBrowser(flags.headless);
    return await demo(stack, browser, flags.keepRunning);
  } finally {
    await browser?.close().catch(() => undefined);
    if (flags.keepRunning) log(`--keep-running: stack left up at ${stack.webUrl}`);
    else await stack.stop();
  }
}

async function demo(stack: Stack, browser: Browser | undefined, keep: boolean): Promise<number> {
  const api = stack.apiUrl;
  const [A, B, C] = await Promise.all([
    launchRoom(api, 'A', scenarios.A),
    launchRoom(api, 'B', scenarios.B),
    launchRoom(api, 'C', scenarios.C),
  ]);
  const untouched = await createSession(api, {
    title: 'Untouched',
    startInSec: 100,
    durationMin: 5,
  });
  const past = await post(api, {
    start: nowS() - 86_400,
    durationMin: 5,
    tz: 'UTC',
    source: 'web',
  });
  const expiredCode = ((await past.json()) as { code: string }).code;
  const adv = await adversarialChecks(api);
  const opened = browser
    ? await openWindows(browser, stack.webUrl, A.session.code)
    : { wins: [], checks: [] };
  const count = opened.wins.length;
  const expectA = () =>
    expectedResult([...scenarios.A.personas, observers(count)], scenarios.A.durationMin);
  log(`${count} browser windows in session A; live phase starts in ~${A.session.start - nowS()}s`);
  const browserChecks = browser
    ? browserPhase(A, opened.wins, (m) => expectA().minutes[m]?.present ?? 0)
    : Promise.resolve([]);
  const [fa, fb, fc] = await Promise.all([
    finishRoom(api, A, expectA),
    finishRoom(api, B, () => expectedResult(scenarios.B.personas, 5)),
    finishRoom(api, C, () => expectedResult([], 5)),
  ]);
  const endChecks = await endPhase(
    browser,
    stack,
    opened.wins,
    fa.result,
    A,
    expiredCode,
    await browserChecks,
  );
  const evidence = await gather(api, browser, stack, { A, untouched, adv: adv.room });
  const sections: Section[] = [
    fa.section,
    fb.section,
    fc.section,
    { title: 'Adversarial sockets', checks: adv.checks },
    { title: 'Browser windows', checks: [...opened.checks, ...endChecks] },
    { title: 'REST sweep', checks: await sweep(api) },
    { title: 'Expectations', checks: expectations(fb.result?.level, fc.result?.peak) },
  ];
  console.log(`\n${formatReport(sections, observationsFrom(evidence))}`);
  if (keep) await new Promise(() => undefined);
  return exitCode(sections);
}

function expectations(levelB?: string, peakC?: number): Check[] {
  return [
    {
      name: 'B is low or passive',
      ok: levelB === 'low' || levelB === 'passive',
      detail: `got ${levelB}`,
    },
    { name: 'C is empty (peak 0)', ok: peakC === 0, detail: `got peak ${peakC}` },
  ];
}

async function endPhase(
  browser: Browser | undefined,
  stack: Stack,
  wins: Win[],
  result: SessionResult | undefined,
  A: RoomRun,
  expiredCode: string,
  before: Check[],
): Promise<Check[]> {
  if (!browser || !result) return before;
  const after = await resultChecks(wins, result);
  const pages = await pageChecks(
    browser,
    stack.webUrl,
    { ended: A.session.code, expired: expiredCode },
    result,
  );
  return [...before, ...after, ...pages];
}

async function gather(
  api: string,
  browser: Browser | undefined,
  stack: Stack,
  x: {
    A: RoomRun;
    untouched: { sessionId: string; end: number };
    adv: { code: string; sessionId: string };
  },
): Promise<Evidence> {
  const late = x.A.parts.find((p) => p.persona.name === 'late-joiner')?.bot;
  const lobby = x.A.parts.find((p) => p.persona.name === 'lurker')?.bot;
  await sleepUntil(x.untouched.end * 1000 + 5000);
  return {
    lateJoinTimelineLen: late ? welcomeTimelineLen(late) : undefined,
    lobbyTicks: lobby ? ticksBeforeLive(lobby) : undefined,
    untouchedState: await stateOf(api, x.untouched.sessionId),
    historyItemHasResult: await historyHasResult(api, x.A.session.code),
    staleTokenSockets: browser ? await staleTokenSockets(browser, stack.webUrl, x.adv) : undefined,
  };
}

async function sweep(api: string): Promise<Check[]> {
  const rest = [...(await seriesChecks(api)), ...(await sessionChecks(api))];
  return [...rest, await rateLimitCheck(api)];
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
