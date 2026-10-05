import { connectBot, type Bot } from './bot';
import { actionsFor, joinOffsetSec, type Action } from './schedule';
import type { Persona } from './types';

export interface Room {
  url: string;
  /** Session start, epoch milliseconds. */
  startMs: number;
}

export interface Participant {
  persona: Persona;
  bot?: Bot;
  /** Problems this participant ran into; the report turns them into a check. */
  problems: string[];
  connected: Promise<void>;
  finished: Promise<void>;
}

const sleepUntil = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms - Date.now())));

async function join(room: Room, p: Participant): Promise<void> {
  const offset = joinOffsetSec(p.persona);
  if (offset !== null) await sleepUntil(room.startMs + offset * 1000);
  p.bot = await connectBot(room.url);
}

async function reconnect(room: Room, p: Participant): Promise<void> {
  const before = p.bot?.participantId;
  p.bot = await connectBot(room.url, { token: p.bot?.token });
  if (p.bot.participantId !== before) p.problems.push('reconnect changed participantId');
}

async function perform(room: Room, p: Participant, a: Action): Promise<void> {
  if (a.kind === 'vote' && a.status) p.bot?.vote(a.status);
  if (a.kind === 'leave' || a.kind === 'drop') p.bot?.close();
  if (a.kind === 'reconnect') await reconnect(room, p);
}

async function act(room: Room, p: Participant): Promise<void> {
  for (const a of actionsFor(p.persona)) {
    await sleepUntil(room.startMs + a.atSec * 1000);
    await perform(room, p, a).catch((e: Error) => void p.problems.push(`${a.kind}: ${e.message}`));
  }
}

/** One simulated person: connects at its join time, then plays its scripted actions. */
export function startParticipant(room: Room, persona: Persona): Participant {
  const p: Participant = {
    persona,
    problems: [],
    connected: Promise.resolve(),
    finished: Promise.resolve(),
  };
  p.connected = join(room, p).catch((e: Error) => void p.problems.push(`connect: ${e.message}`));
  p.finished = p.connected.then(() => act(room, p));
  return p;
}
