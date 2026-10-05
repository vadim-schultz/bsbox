import { vi } from 'vitest';

/** Test double for the Office host slice used by services/officeApi. */
export function installFakeOffice(
  opts: { props?: Record<string, string>; failInsert?: boolean } = {},
) {
  const props = new Map<string, string>(Object.entries(opts.props ?? {}));
  const ok = <T>(value: T) => ({ status: 'succeeded', value });
  const getter = <T>(value: T) => ({
    getAsync: (cb: (r: unknown) => void) => cb(ok(value)),
  });
  const setSelectedDataAsync = vi.fn((_d: string, _o: unknown, cb: (r: unknown) => void) =>
    cb(
      opts.failInsert
        ? { status: 'failed', value: undefined, error: { message: 'x' } }
        : ok(undefined),
    ),
  );
  const item = {
    subject: getter('Weekly sync'),
    start: getter(new Date('2030-01-07T09:00:00Z')),
    end: getter(new Date('2030-01-07T09:30:00Z')),
    recurrence: getter(null),
    body: {
      getAsync: (_t: string, cb: (r: unknown) => void) =>
        cb(ok('Join https://teams.microsoft.com/l/meetup-join/abc123 now')),
      setSelectedDataAsync,
    },
    loadCustomPropertiesAsync: (cb: (r: unknown) => void) =>
      cb(
        ok({
          get: (k: string) => props.get(k),
          set: (k: string, v: string) => void props.set(k, v),
          saveAsync: (done: (r: unknown) => void) => done(ok(undefined)),
        }),
      ),
  };
  vi.stubGlobal('Office', {
    context: {
      displayLanguage: 'en-US',
      mailbox: { item },
      requirements: { isSetSupported: () => true },
    },
  });
  return { props, setSelectedDataAsync };
}
