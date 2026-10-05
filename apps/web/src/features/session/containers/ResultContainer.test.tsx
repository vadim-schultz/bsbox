import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SessionResult } from '@bsbox/shared';
import { AppProviders } from '../../../app/AppProviders';
import { ApiError } from '../../../lib';
import { storeLocale, type Locale } from '../../../i18n';
import { ResultContainer } from './ResultContainer';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('../services', () => ({ getSession: mocks.getSession }));

const result = (over: Partial<SessionResult> = {}): SessionResult => ({
  score: 0.7,
  level: 'high',
  raw: 0.6,
  peak: 5,
  participationRate: 0.8,
  minutes: [
    { minuteIdx: 0, present: 5, engaged: 1 },
    { minuteIdx: 1, present: 5, engaged: 5 },
    { minuteIdx: 2, present: 4, engaged: 2 },
  ],
  ...over,
});

const START = 1_800_000_000;
const mount = (pushed: SessionResult | null = null, locale: Locale = 'en') => {
  storeLocale(locale);
  return render(
    <AppProviders>
      <ResultContainer sessionId="ABC-1" title="Weekly sync" start={START} result={pushed} />
    </AppProviders>,
  );
};
const flat = (el: HTMLElement) => (el.textContent ?? '').replace(/\s/g, ' ');

beforeEach(() => {
  mocks.getSession.mockReset();
});
afterEach(cleanup);

describe('ResultContainer', () => {
  it('renders a pushed result as round(score*100)% with the level label in en and de', () => {
    mount(result());
    expect(screen.getByText('70%')).toBeTruthy();
    expect(screen.getByText('Highly Interactive')).toBeTruthy();
    expect(mocks.getSession).not.toHaveBeenCalled();
    cleanup();
    mount(result(), 'de');
    expect(screen.getByText(/^70\s%$/)).toBeTruthy();
    expect(screen.getByText('Hochinteraktiv')).toBeTruthy();
  });

  it('fetches the result by id on reload and copies a localized summary', async () => {
    mocks.getSession.mockResolvedValue({
      id: 'ABC-1',
      series: 'ABC',
      state: 'ended',
      start: START,
      end: START + 1800,
      result: result({ score: 0.456 }),
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    mount();
    expect(await screen.findByText('46%')).toBeTruthy();
    expect(mocks.getSession.mock.calls[0]?.[0]).toBe('ABC-1');
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = String(writeText.mock.calls[0]?.[0]);
    expect(text).toContain('Weekly sync');
    expect(text).toContain('46%');
    expect(text).toContain('Highly Interactive');
    expect(text).toContain('January 15, 2027');
    vi.unstubAllGlobals();
  });

  it('shows an empty state, not NaN or a ring, when peak is 0', () => {
    mount(result({ peak: 0, score: 0, level: 'low', participationRate: 0, minutes: [] }));
    expect(screen.getByText('No one took part')).toBeTruthy();
    expect(screen.queryByTestId('score-ring')).toBeNull();
    expect(flat(document.body)).not.toContain('NaN');
  });

  it('shows the expired state on 410', async () => {
    mocks.getSession.mockRejectedValue(new ApiError('session_expired', 410, 'gone'));
    mount();
    expect(await screen.findByText('This meeting has expired')).toBeTruthy();
  });

  it('falls back to a selectable text field when the clipboard fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    mount(result());
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }));
    const field = await screen.findByRole('textbox');
    expect((field as HTMLTextAreaElement).value).toContain('Weekly sync');
    vi.unstubAllGlobals();
  });
});
