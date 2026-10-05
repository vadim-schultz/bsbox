import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SeriesResponse, ServerMessage } from '@bsbox/shared';
import { AppProviders } from '../../../app/AppProviders';
import { SessionContainer } from './SessionContainer';

interface Opts {
  onMessage: (m: ServerMessage) => void;
  onOpen: () => void;
  onClose: () => void;
}
const mocks = vi.hoisted(() => ({
  getSeries: vi.fn(),
  send: vi.fn(),
  opts: null as null | Opts,
}));

vi.mock('../../series/services', () => ({ getSeries: mocks.getSeries }));
vi.mock('../../../lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib')>()),
  createSocket: (o: Opts) => {
    mocks.opts = o;
    return { send: mocks.send, close: vi.fn() };
  },
}));

const NOW = 1_800_000_000;
const series: SeriesResponse = {
  code: 'ABC',
  title: 'Weekly sync',
  schedule: { tz: 'UTC', start: NOW - 60, durationMin: 30, rrule: null },
  session: { id: 'ABC-1', state: 'live', start: NOW - 60, end: NOW + 1740 },
  serverTime: NOW,
};
const welcome: ServerMessage = {
  type: 'welcome',
  participantId: 'p1',
  token: 'tok-1',
  session: series.session,
  timeline: [{ minuteIdx: 0, present: 4, engaged: 1 }],
};

const emit = (m: ServerMessage) => act(() => mocks.opts?.onMessage(m));
const mount = async () => {
  mocks.getSeries.mockResolvedValue(series);
  render(
    <AppProviders>
      <SessionContainer code="ABC" />
    </AppProviders>,
  );
  await screen.findByText('Weekly sync');
  act(() => mocks.opts?.onOpen());
  emit(welcome);
};
const card = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  mocks.send.mockReset();
  mocks.opts = null;
});
afterEach(cleanup);

describe('live voting', () => {
  it('sends vote engaged, presses at once, and a tick updates chart and table', async () => {
    await mount();
    fireEvent.click(card(/this is interesting/i));
    expect(mocks.send).toHaveBeenCalledWith({ type: 'vote', status: 'engaged' });
    expect(card(/this is interesting/i).getAttribute('aria-pressed')).toBe('true');
    emit({ type: 'tick', minuteIdx: 1, present: 5, engaged: 4, speaking: 0 });
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[2]?.textContent).toContain('5');
    expect(screen.getByTestId('chart').querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('sends disengaged when the active card is tapped again', async () => {
    await mount();
    fireEvent.click(card(/this is interesting/i));
    fireEvent.click(card(/this is interesting/i));
    expect(mocks.send).toHaveBeenLastCalledWith({ type: 'vote', status: 'disengaged' });
    expect(card(/this is interesting/i).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('live failure handling', () => {
  it('rolls back the optimistic vote on not_live and shows a message', async () => {
    await mount();
    fireEvent.click(card(/this is interesting/i));
    emit({ type: 'error', code: 'not_live' });
    expect(card(/this is interesting/i).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('alert').textContent).toContain('not live');
  });

  it('shows the reconnect banner, keeps the chart, reuses the token, and skips spring with reduced motion', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await mount();
    expect(screen.queryByText(/reconnecting/i)).toBeNull();
    act(() => mocks.opts?.onClose());
    expect(screen.getByText(/reconnecting/i)).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(2);
    act(() => mocks.opts?.onOpen());
    expect(mocks.send).toHaveBeenLastCalledWith({ type: 'hello', token: 'tok-1' });
    emit(welcome);
    expect(screen.queryByText(/reconnecting/i)).toBeNull();
    expect(document.querySelector('.bsbox-spring')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('applies the spring class when motion is allowed', async () => {
    await mount();
    expect(document.querySelector('.bsbox-spring')).not.toBeNull();
  });
});
