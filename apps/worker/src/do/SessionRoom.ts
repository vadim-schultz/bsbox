import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env';
import { keepsPendingAlarm, rearm, runAlarm, type AlarmDeps } from './alarm';
import { handleFrame, type HandlerCtx } from './handlers';
import { recordMetric } from '../observability';
import { createStore, type Store } from './store';

/** Window headers set by the socket controller when it forwards the upgrade. */
export const H_SESSION_ID = 'x-bsbox-session-id';
export const H_SESSION_START = 'x-bsbox-session-start';
export const H_SESSION_END = 'x-bsbox-session-end';

/** One room per session: owns participants and votes; sockets use the Hibernation API. */
export class SessionRoom extends DurableObject<Env> {
  private readonly store: Store;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.store = createStore(state.storage.sql);
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    this.syncSession(req);
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    rearm(this.alarmDeps());
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    const pid = ws.deserializeAttachment() as string | null;
    const res = await handleFrame(this.handlerCtx(), pid ?? undefined, message);
    if (res.pid && res.pid !== pid) ws.serializeAttachment(res.pid);
    for (const reply of res.replies) ws.send(JSON.stringify(reply));
    this.measure(message, res.replies);
    if (res.close) ws.close(res.close.code, res.close.reason);
    rearm(this.alarmDeps());
  }

  async alarm(): Promise<void> {
    const wasEnded = this.store.getSession()?.phase === 'ended';
    await runAlarm(this.alarmDeps());
    if (!wasEnded && this.store.getSession()?.phase === 'ended') recordMetric(this.env, 'finalize');
  }

  /** Analytics Engine counters for joins, votes and error codes; never records identities. */
  private measure(message: string, replies: readonly { type: string; code?: string }[]): void {
    for (const r of replies) {
      if (r.type === 'welcome') recordMetric(this.env, 'join');
      if (r.type === 'error') recordMetric(this.env, 'error', r.code);
    }
    if (replies.length === 0 && message.includes('"vote"')) recordMetric(this.env, 'vote');
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const pid = ws.deserializeAttachment() as string | null;
    if (pid) {
      this.store.markLeft(pid, this.nowSec());
      this.store.markDirty();
      rearm(this.alarmDeps());
    }
  }

  private alarmDeps(): AlarmDeps {
    return {
      store: this.store,
      d1: this.env.DB,
      now: () => this.nowSec(),
      openIds: () =>
        this.ctx.getWebSockets().flatMap((w) => {
          const pid = w.deserializeAttachment() as string | null;
          return pid ? [pid] : [];
        }),
      broadcast: (msg) => {
        const raw = JSON.stringify(msg);
        for (const w of this.ctx.getWebSockets()) w.send(raw);
      },
      closeAll: () => {
        for (const w of this.ctx.getWebSockets()) w.close(1000, 'ended');
      },
      purge: async () => {
        this.store.clearAll();
        await this.ctx.storage.deleteAlarm();
      },
      setAlarm: (at) => void this.schedule(at),
    };
  }

  private async schedule(at: number | null): Promise<void> {
    if (at === null) return this.ctx.storage.deleteAlarm();
    const wantMs = at * 1000;
    const current = await this.ctx.storage.getAlarm();
    if (keepsPendingAlarm(current, wantMs, Date.now())) return;
    await this.ctx.storage.setAlarm(wantMs);
  }

  private nowSec(): number {
    return Math.floor(Date.now() / 1000);
  }

  private handlerCtx(): HandlerCtx {
    const sessionId = this.store.getSession()?.sessionId ?? '';
    return {
      store: this.store,
      now: () => this.nowSec(),
      secret: this.env.TOKEN_HMAC_KEY,
      sessionId,
    };
  }

  private syncSession(req: Request): void {
    const sessionId = req.headers.get(H_SESSION_ID);
    if (!sessionId) return;
    const prev = this.store.getSession();
    this.store.saveSession({
      sessionId,
      start: Number(req.headers.get(H_SESSION_START)),
      end: Number(req.headers.get(H_SESSION_END)),
      phase: prev?.phase ?? 'open',
    });
  }
}
