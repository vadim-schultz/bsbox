import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProviders } from '../../../../app/AppProviders';
import { History } from './History';

const mocks = vi.hoisted(() => ({ listSessions: vi.fn() }));
vi.mock('../../services', () => ({ listSessions: mocks.listSessions }));

const item = (n: number, score?: number) => ({
  id: `ABC-${n}`,
  series: 'ABC',
  state: 'ended',
  start: 1_800_000_000 + n * 86_400,
  end: 1_800_001_800 + n * 86_400,
  ...(score === undefined
    ? {}
    : {
        result: { score, level: 'healthy', raw: score, peak: 3, participationRate: 1, minutes: [] },
      }),
});

afterEach(cleanup);

describe('History', () => {
  it('lists past sessions with their score', async () => {
    mocks.listSessions.mockResolvedValue({ items: [item(1, 0.5), item(2)], nextCursor: null });
    render(
      <AppProviders>
        <History code="ABC" />
      </AppProviders>,
    );
    expect(await screen.findByText('50%')).toBeTruthy();
    expect(screen.getByText('No result')).toBeTruthy();
    expect(mocks.listSessions.mock.calls[0]?.[0]).toBe('ABC');
  });

  it('shows an empty message for no sessions and an error when loading fails', async () => {
    mocks.listSessions.mockResolvedValueOnce({ items: [], nextCursor: null });
    const { unmount } = render(
      <AppProviders>
        <History code="ABC" />
      </AppProviders>,
    );
    expect(await screen.findByText('No past meetings yet.')).toBeTruthy();
    unmount();
    mocks.listSessions.mockRejectedValueOnce(new Error('x'));
    render(
      <AppProviders>
        <History code="ABC" />
      </AppProviders>,
    );
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
