import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProviders } from '../../../app/AppProviders';
import { TeamsPanel } from './TeamsPanel';
import * as teams from '../services/teamsApi';

vi.mock('../services/teamsApi');
vi.mock('../../session', () => ({
  SessionContainer: ({ code }: { code: string }) => <p>live view {code}</p>,
}));

const host = {
  context: { theme: 'dark', locale: 'en-US', meetingId: 'm1' },
  meeting: { joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc', title: 'Weekly' },
};
const created = { code: 'ABC-DEF', joinUrl: 'https://bsbox.test/m/ABC-DEF', editToken: 't' };
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const renderPanel = () =>
  render(
    <AppProviders>
      <TeamsPanel />
    </AppProviders>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('TeamsPanel', () => {
  it('creates the series via externalKey, shows the live view and the share link', async () => {
    vi.mocked(teams.loadTeamsHost).mockResolvedValue(host);
    const fetchMock = vi.fn().mockResolvedValue(json(201, created));
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    await screen.findByText('live view ABC-DEF');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/series');
    expect(JSON.parse(init.body as string)).toMatchObject({
      source: 'teams',
      externalKey: expect.stringMatching(/^teams:[0-9a-f]+$/),
    });
    expect(screen.getByRole('link', { name: /\/m\/ABC-DEF$/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /\/m\/ABC-DEF$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeTruthy();
  });

  it('sends the same externalKey when the panel opens twice', async () => {
    vi.mocked(teams.loadTeamsHost).mockResolvedValue(host);
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json(200, created)));
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    await screen.findByText('live view ABC-DEF');
    cleanup();
    renderPanel();
    await screen.findByText('live view ABC-DEF');
    const keys = fetchMock.mock.calls.map(
      ([, init]) =>
        (JSON.parse((init as RequestInit).body as string) as { externalKey: string }).externalKey,
    );
    expect(keys[0]).toBe(keys[1]);
  });

  it('shows an open-inside-Teams notice outside Teams', async () => {
    vi.mocked(teams.loadTeamsHost).mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    await screen.findByText('Open BSBox inside Teams');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows an error when the series cannot be created', async () => {
    vi.mocked(teams.loadTeamsHost).mockResolvedValue(host);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(500, { code: 'internal_error', title: 'boom' })),
    );
    renderPanel();
    await screen.findByText('BSBox could not start');
  });
});
