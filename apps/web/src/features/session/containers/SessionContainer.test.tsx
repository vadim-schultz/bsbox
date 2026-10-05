import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SeriesResponse, ServerMessage } from '@bsbox/shared';
import { AppProviders } from '../../../app/AppProviders';
import { ApiError } from '../../../lib';
import { SessionContainer } from './SessionContainer';

const mocks = vi.hoisted(() => ({
  getSeries: vi.fn(),
  onMessage: null as null | ((m: ServerMessage) => void),
}));

vi.mock('../../series/services', () => ({ getSeries: mocks.getSeries }));
vi.mock('../../../lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib')>()),
  createSocket: (o: { onMessage: (m: ServerMessage) => void }) => {
    mocks.onMessage = o.onMessage;
    return { send: vi.fn(), close: vi.fn() };
  },
}));

const SERVER_NOW = 1_800_000_000;
const series = (state: 'scheduled' | 'live' | 'ended' = 'scheduled'): SeriesResponse => ({
  code: 'ABC',
  title: 'Weekly sync',
  schedule: { tz: 'UTC', start: SERVER_NOW + 90, durationMin: 30, rrule: null },
  session: { id: 'ABC-1', state, start: SERVER_NOW + 90, end: SERVER_NOW + 1890 },
  serverTime: SERVER_NOW,
});

const mount = () =>
  render(
    <AppProviders>
      <SessionContainer code="ABC" />
    </AppProviders>,
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(SERVER_NOW * 1000);
  mocks.getSeries.mockReset();
  mocks.onMessage = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SessionContainer', () => {
  it('shows title and server-based countdown, then switches to live on phase live', async () => {
    mocks.getSeries.mockResolvedValue(series());
    mount();
    expect(await screen.findByText('Weekly sync')).toBeTruthy();
    expect(screen.getByTestId('countdown').textContent).toBe('1:30');
    expect(screen.queryByRole('status')).toBeNull();
    act(() => mocks.onMessage?.({ type: 'phase', state: 'live', at: SERVER_NOW + 90 }));
    expect(screen.getByRole('group', { name: 'How engaged are you?' })).toBeTruthy();
  });

  it('warns about a skewed device clock while the countdown still follows the server', async () => {
    vi.setSystemTime((SERVER_NOW + 30) * 1000);
    mocks.getSeries.mockResolvedValue(series());
    mount();
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.getByTestId('countdown').textContent).toBe('1:30');
  });

  it('shows presence from ticks', async () => {
    mocks.getSeries.mockResolvedValue(series());
    mount();
    await screen.findByText('Weekly sync');
    act(() =>
      mocks.onMessage?.({ type: 'tick', minuteIdx: 0, present: 4, engaged: 0, speaking: 0 }),
    );
    expect(screen.getByText('4 here')).toBeTruthy();
  });

  it('shows not found without retry and without refetching', async () => {
    mocks.getSeries.mockRejectedValue(new ApiError('series_not_found', 404, 'nope'));
    mount();
    expect(await screen.findByText('Meeting not found')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(mocks.getSeries).toHaveBeenCalledTimes(1);
  });

  it('shows the expired state', async () => {
    mocks.getSeries.mockRejectedValue(new ApiError('session_expired', 410, 'gone'));
    mount();
    expect(await screen.findByText('This meeting has expired')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a network error whose retry button refetches', async () => {
    mocks.getSeries.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    mocks.getSeries.mockResolvedValueOnce(series());
    mount();
    expect(await screen.findByText('Connection problem')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Weekly sync')).toBeTruthy();
    expect(mocks.getSeries).toHaveBeenCalledTimes(2);
  });
});
