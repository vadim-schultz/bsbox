import type { SessionResult } from '@bsbox/shared';
import { attempt, expectEqual } from './attempt';
import { wsUrl } from './api';
import { connectBot } from './bot';
import { agreedResult, mismatchedClose } from './collect';
import { compareResults } from './compare';
import type { Expected } from './groundTruth';
import { log, sleepUntil } from './log';
import { botsOf, type RoomRun } from './room';
import type { Section } from './report';
import type { Check } from './types';

const SETTLE_MS = 15_000;

async function restResult(api: string, id: string): Promise<SessionResult | undefined> {
  const res = await fetch(`${api}/api/sessions/${id}`);
  return ((await res.json()) as { result?: SessionResult }).result;
}

async function replayCheck(api: string, run: RoomRun, pushed: SessionResult): Promise<Check> {
  return attempt(`${run.key} late socket gets welcome(ended) + phase + ended`, async () => {
    const bot = await connectBot(wsUrl(api, run.session.sessionId));
    const ended = await bot.next((m) => m.type === 'ended');
    expectEqual(
      'replayed result',
      JSON.stringify(pushed),
      JSON.stringify(ended.type === 'ended' && ended.result),
    );
    const welcome = bot.messages.find((m) => m.type === 'welcome');
    expectEqual(
      'welcome state',
      'ended',
      welcome?.type === 'welcome' ? welcome.session.state : '?',
    );
    bot.close();
  });
}

function pushChecks(run: RoomRun, pushed: SessionResult | undefined, agree: boolean): Check[] {
  const closed = mismatchedClose(botsOf(run));
  return [
    {
      name: `${run.key} server pushed a result`,
      ok: pushed !== undefined,
      detail: 'no bot received `ended`',
    },
    {
      name: `${run.key} all pushed results agree`,
      ok: agree,
      detail: 'bots received different results',
    },
    {
      name: `${run.key} every socket closed with 1000`,
      ok: closed === 0,
      detail: `${closed} sockets closed differently`,
    },
    ...run.parts
      .map((p) => ({
        name: `${run.key} ${p.persona.name} ran cleanly`,
        ok: p.problems.length === 0,
        detail: p.problems.join('; '),
      }))
      .filter((c) => !c.ok),
  ];
}

export interface Finished {
  section: Section;
  result?: SessionResult;
}

/** Waits for the end, then compares the pushed result, the REST result and ground truth. */
export async function finishRoom(
  api: string,
  run: RoomRun,
  expected: () => Expected,
): Promise<Finished> {
  await sleepUntil(run.session.end * 1000 + SETTLE_MS);
  const { result, agree } = agreedResult(botsOf(run));
  log(
    `session ${run.key} ended: ${result ? `score ${result.score.toFixed(3)} ${result.level} peak ${result.peak}` : 'NO RESULT'}`,
  );
  const checks = pushChecks(run, result, agree);
  if (result) {
    checks.push(...compareResults(run.key, expected(), result));
    checks.push(
      await attempt(`${run.key} REST result equals pushed result`, async () => {
        expectEqual(
          'result',
          JSON.stringify(result),
          JSON.stringify(await restResult(api, run.session.sessionId)),
        );
      }),
    );
    checks.push(await replayCheck(api, run, result));
  }
  return { section: { title: `Session ${run.key}: ${run.scenario.title}`, checks }, result };
}
