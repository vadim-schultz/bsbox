import { afterEach, describe, expect, it, vi } from 'vitest';
import { logEvent, recordMetric, redactUrl } from './observability';

const lastLog = (spy: ReturnType<typeof vi.spyOn>) => JSON.parse(String(spy.mock.calls[0]?.[0]));

afterEach(() => vi.restoreAllMocks());

describe('logEvent', () => {
  it('emits one structured JSON line with code and duration', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logEvent({ event: 'vote', code: 'ok', durationMs: 12 });
    expect(lastLog(spy)).toMatchObject({
      level: 'info',
      event: 'vote',
      code: 'ok',
      durationMs: 12,
    });
  });

  it('redacts authorization, token and participant fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logEvent({
      event: 'join',
      durationMs: 1,
      authorization: 'Bearer abc',
      token: 'secret-token',
      participantId: 'p-123',
      url: 'https://x.test/api/sessions/1/ws?token=secret-token&a=1',
    });
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toContain('abc');
    expect(line).not.toContain('secret-token');
    expect(line).not.toContain('p-123');
    expect(lastLog(spy).url).toContain('a=1');
  });
});

describe('redactUrl', () => {
  it('redacts token-like query values and keeps the rest', () => {
    const out = redactUrl('https://x.test/p?token=abc&access_token=def&keep=1');
    expect(out).not.toContain('abc');
    expect(out).not.toContain('def');
    expect(out).toContain('keep=1');
  });

  it('returns unparseable input as a placeholder instead of raw text', () => {
    expect(redactUrl('not a url?token=abc')).toBe('[invalid-url]');
  });
});

describe('recordMetric', () => {
  it('writes a datapoint to Analytics Engine when bound', () => {
    const writeDataPoint = vi.fn();
    recordMetric({ EVENTS: { writeDataPoint } }, 'join', 'ok');
    expect(writeDataPoint).toHaveBeenCalledWith({
      blobs: ['join', 'ok'],
      doubles: [1],
      indexes: ['join'],
    });
  });

  it('is a no-op when the dataset is not bound', () => {
    expect(() => recordMetric({}, 'join')).not.toThrow();
  });
});
