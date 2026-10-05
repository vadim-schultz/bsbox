import { attempt, expectEqual } from './attempt';
import { createSession, wsUrl } from './api';
import { connectBot, type Bot } from './bot';
import type { Check } from './types';

const CLOSE_BAD_TOKEN = 4401;

async function expectCode(bot: Bot, code: string): Promise<void> {
  const msg = await bot.next((m) => m.type === 'error');
  expectEqual('error code', code, msg.type === 'error' ? msg.code : msg.type);
}

const voteBeforeHello = async (url: string) => {
  const bot = await connectBot(url, { hello: false });
  bot.vote('engaged');
  await expectCode(bot, 'bad_message');
};

const voteInLobby = async (url: string) => {
  const bot = await connectBot(url);
  bot.vote('engaged');
  await expectCode(bot, 'not_live');
};

const malformedJson = async (url: string) => {
  const bot = await connectBot(url, { hello: false });
  bot.sendRaw('{not json');
  await expectCode(bot, 'bad_message');
  expectEqual('socket open', true, bot.isOpen());
};

async function expectRejectedToken(url: string, token: string): Promise<void> {
  const bot = await connectBot(url, { token });
  await expectCode(bot, 'bad_token');
  await new Promise((r) => setTimeout(r, 300));
  expectEqual('close code', CLOSE_BAD_TOKEN, bot.closeCode);
}

const tampered = async (url: string) => {
  const good = (await connectBot(url)).token ?? '';
  await expectRejectedToken(url, `${good.slice(0, -2)}xx`);
};

const foreignToken = async (url: string, otherUrl: string) => {
  const foreign = (await connectBot(otherUrl)).token ?? '';
  await expectRejectedToken(url, foreign);
};

const plainGet = async (api: string, sessionId: string) => {
  const res = await fetch(`${api}/api/sessions/${sessionId}/ws`);
  expectEqual('status', 400, res.status);
};

/** Malformed or hostile clients, run against two dedicated lobby-only sessions. */
export async function adversarialChecks(api: string): Promise<Check[]> {
  const [x, y] = await Promise.all(
    ['Adversarial room', 'Foreign room'].map((title) =>
      createSession(api, { title, startInSec: 3600, durationMin: 5 }),
    ),
  );
  if (!x || !y) throw new Error('adversarial sessions were not created');
  const [url, other] = [wsUrl(api, x.sessionId), wsUrl(api, y.sessionId)];
  return [
    await attempt('vote before hello -> bad_message', () => voteBeforeHello(url)),
    await attempt('vote in lobby -> not_live', () => voteInLobby(url)),
    await attempt('malformed JSON -> bad_message, socket stays open', () => malformedJson(url)),
    await attempt('tampered token -> bad_token + close 4401', () => tampered(url)),
    await attempt('token from another session -> 4401', () => foreignToken(url, other)),
    await attempt('non-upgrade GET on /ws -> 400', () => plainGet(api, x.sessionId)),
  ];
}
