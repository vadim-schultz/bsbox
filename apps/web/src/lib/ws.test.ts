import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSocket, backoffDelay } from './ws';

class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  sent: string[] = [];
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
}

const schema = z.object({ type: z.literal('pong'), n: z.number() });

beforeEach(() => {
  FakeSocket.instances = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

const make = (onMessage: (m: z.infer<typeof schema>) => void, random = () => 0.5) =>
  createSocket({
    url: 'wss://example.test/ws',
    schema,
    onMessage,
    factory: (u) => new FakeSocket(u) as unknown as WebSocket,
    random,
    baseDelayMs: 100,
    maxDelayMs: 10_000,
  });

describe('ws', () => {
  it('delivers a valid message', () => {
    const got: unknown[] = [];
    make((m) => got.push(m));
    FakeSocket.instances[0]!.onmessage?.({ data: JSON.stringify({ type: 'pong', n: 1 }) });
    expect(got).toEqual([{ type: 'pong', n: 1 }]);
  });

  it('drops invalid frames', () => {
    const got: unknown[] = [];
    make((m) => got.push(m));
    const s = FakeSocket.instances[0]!;
    s.onmessage?.({ data: 'not json' });
    s.onmessage?.({ data: JSON.stringify({ type: 'pong', n: 'x' }) });
    expect(got).toEqual([]);
  });

  it('reconnects with growing delay and jitter after close', () => {
    make(() => undefined);
    expect(backoffDelay(0, 100, 10_000, () => 0)).toBe(100);
    expect(backoffDelay(1, 100, 10_000, () => 0)).toBe(200);
    expect(backoffDelay(1, 100, 10_000, () => 0.5)).toBe(250);
    expect(backoffDelay(20, 100, 10_000, () => 0)).toBe(10_000);

    FakeSocket.instances[0]!.onclose?.();
    vi.advanceTimersByTime(149);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1); // 100 + 0.5*100 = 150
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.instances[1]!.onclose?.();
    vi.advanceTimersByTime(249); // 200 + 50
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(3);
  });

  it('does not reconnect after close()', () => {
    const c = make(() => undefined);
    c.close();
    FakeSocket.instances[0]!.onclose?.();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(1);
  });
});
