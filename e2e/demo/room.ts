import { createSession, wsUrl, type NewSession } from './api';
import { connectBot, type Bot } from './bot';
import { log } from './log';
import { startParticipant, type Participant, type Room } from './participant';
import { joinOffsetSec } from './schedule';
import type { RoomKey, Scenario } from './scenarios';

export interface RoomRun {
  key: RoomKey;
  scenario: Scenario;
  session: NewSession;
  parts: Participant[];
  ghost?: Bot;
}

const LEAD_SEC = 100;

const flatten = (s: Scenario) =>
  s.personas.flatMap((p) => Array.from({ length: p.count }, () => p));

/** Creates the session and connects everyone who joins in the lobby. */
export async function launchRoom(api: string, key: RoomKey, scenario: Scenario): Promise<RoomRun> {
  const session = await createSession(api, {
    title: scenario.title,
    startInSec: LEAD_SEC,
    durationMin: scenario.durationMin,
  });
  const url = wsUrl(api, session.sessionId);
  const room: Room = { url, startMs: session.start * 1000 };
  const parts = flatten(scenario).map((p) => startParticipant(room, { ...p, count: 1 }));
  const lobby = parts.filter((p) => joinOffsetSec(p.persona) === null);
  await Promise.all(lobby.map((p) => p.connected));
  const ghost = scenario.ghost ? await connectBot(url, { hello: false }) : undefined;
  log(`session ${key} "${scenario.title}": ${lobby.length} in lobby, starts in ~${LEAD_SEC}s`);
  return { key, scenario, session, parts, ghost };
}

/** Every socket we hold for the room, for result collection. */
export const botsOf = (run: RoomRun): Bot[] =>
  [...run.parts.map((p) => p.bot), run.ghost].filter((b): b is Bot => b !== undefined);
