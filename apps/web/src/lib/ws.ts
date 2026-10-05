import type { ZodType } from 'zod';

export interface SocketOptions<T> {
  url: string;
  schema: ZodType<T>;
  onMessage: (message: T) => void;
  onOpen?: () => void;
  onClose?: () => void;
  factory?: (url: string) => WebSocket;
  random?: () => number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface SocketHandle {
  send: (message: unknown) => void;
  close: () => void;
}

/** Exponential backoff capped at max, plus up to one base interval of jitter. */
export function backoffDelay(
  attempt: number,
  base: number,
  max: number,
  random: () => number,
): number {
  return Math.min(max, base * 2 ** attempt + random() * base);
}

/** Typed socket: validates inbound frames with Zod and reconnects until closed. */
export function createSocket<T>(options: SocketOptions<T>): SocketHandle {
  const { url, schema, onMessage } = options;
  const factory = options.factory ?? ((u: string) => new WebSocket(u));
  const random = options.random ?? Math.random;
  const base = options.baseDelayMs ?? 500;
  const max = options.maxDelayMs ?? 30_000;
  let socket: WebSocket | null = null;
  let attempt = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    const s = factory(url);
    socket = s;
    s.onopen = () => {
      attempt = 0;
      options.onOpen?.();
    };
    s.onmessage = (event: MessageEvent<string>) => {
      let raw: unknown;
      try {
        raw = JSON.parse(event.data);
      } catch {
        return;
      }
      const parsed = schema.safeParse(raw);
      if (parsed.success) onMessage(parsed.data);
    };
    s.onclose = () => {
      options.onClose?.();
      if (stopped) return;
      timer = setTimeout(connect, backoffDelay(attempt, base, max, random));
      attempt += 1;
    };
  };
  connect();

  return {
    send: (message) => socket?.send(JSON.stringify(message)),
    close: () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    },
  };
}
