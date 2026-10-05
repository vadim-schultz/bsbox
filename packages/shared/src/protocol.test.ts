import { describe, expect, it } from 'vitest';
import { clientMessageSchema, serverMessageSchema } from './protocol';

describe('protocol', () => {
  it('parses valid client and server messages', () => {
    expect(clientMessageSchema.parse({ type: 'vote', status: 'engaged' })).toEqual({
      type: 'vote',
      status: 'engaged',
    });
    expect(clientMessageSchema.parse({ type: 'hello' }).type).toBe('hello');
    expect(clientMessageSchema.parse({ type: 'ping' }).type).toBe('ping');
    expect(
      serverMessageSchema.parse({ type: 'tick', minuteIdx: 3, present: 5, engaged: 2, speaking: 1 })
        .type,
    ).toBe('tick');
    expect(serverMessageSchema.parse({ type: 'error', code: 'bad_token' }).type).toBe('error');
    expect(serverMessageSchema.parse({ type: 'phase', state: 'live', at: 100 }).type).toBe('phase');
  });

  it('rejects an unknown type and an invalid vote status', () => {
    expect(() => clientMessageSchema.parse({ type: 'dance' })).toThrow();
    expect(() => clientMessageSchema.parse({ type: 'vote', status: 'bored' })).toThrow();
    expect(() => serverMessageSchema.parse({ type: 'error', code: 'nope' })).toThrow();
  });
});
