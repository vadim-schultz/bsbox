import type { ServerMessage, SessionResult, VoteStatus } from '@bsbox/shared';
import { waitUntil } from './poll';

export interface Bot {
  messages: ServerMessage[];
  participantId?: string;
  token?: string;
  result?: SessionResult;
  closeCode?: number;
  vote: (status: VoteStatus) => void;
  sendRaw: (text: string) => void;
  close: () => void;
  /** Resolves with the first received message matching the predicate. */
  next: (pred: (m: ServerMessage) => boolean, ms?: number) => Promise<ServerMessage>;
  isOpen: () => boolean;
}

export interface BotOptions {
  /** Send hello on open (default true). */
  hello?: boolean;
  token?: string;
}

function onMessage(bot: Bot, raw: unknown): void {
  const msg = JSON.parse(String(raw)) as ServerMessage;
  bot.messages.push(msg);
  if (msg.type === 'welcome')
    Object.assign(bot, { participantId: msg.participantId, token: msg.token });
  if (msg.type === 'ended') bot.result = msg.result;
}

function makeBot(ws: WebSocket): Bot {
  const bot: Bot = {
    messages: [],
    vote: (status) => ws.send(JSON.stringify({ type: 'vote', status })),
    sendRaw: (text) => ws.send(text),
    close: () => ws.close(1000),
    isOpen: () => ws.readyState === WebSocket.OPEN,
    next: async (pred, ms = 10_000) => {
      const find = () => bot.messages.find(pred);
      await waitUntil(async () => find() !== undefined, {
        timeoutMs: ms,
        intervalMs: 50,
        what: 'a message',
      });
      return find() as ServerMessage;
    },
  };
  ws.onmessage = (e) => onMessage(bot, e.data);
  ws.onclose = (e) => void (bot.closeCode = e.code);
  return bot;
}

/** Opens a socket; unless told otherwise says hello and waits for the welcome. */
export async function connectBot(url: string, o: BotOptions = {}): Promise<Bot> {
  const ws = new WebSocket(url);
  const bot = makeBot(ws);
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error(`websocket failed to open: ${url}`));
  });
  if (o.hello === false) return bot;
  ws.send(JSON.stringify({ type: 'hello', ...(o.token ? { token: o.token } : {}) }));
  await bot.next((m) => m.type === 'welcome' || m.type === 'error');
  return bot;
}
