import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '../../../app/AppProviders';
import { ComposePane } from './ComposePane';
import { installFakeOffice } from './fakeOffice';

const created = { code: 'ABC-DEF', joinUrl: 'https://bsbox.test/m/ABC-DEF', editToken: 'tok' };
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const renderPane = () =>
  render(
    <AppProviders>
      <ComposePane />
    </AppProviders>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ComposePane', () => {
  it('adds BSBox once, inserts the join URL and stores code and token', async () => {
    const office = installFakeOffice();
    const fetchMock = vi.fn().mockResolvedValue(json(201, created));
    vi.stubGlobal('fetch', fetchMock);
    renderPane();
    await userEvent.click(await screen.findByRole('button', { name: 'Add BSBox' }));
    await screen.findByText('BSBox is part of this invite.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/series');
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({
      source: 'outlook',
      durationMin: 30,
      externalKey: 'https://teams.microsoft.com/l/meetup-join/abc123',
    });
    expect(office.setSelectedDataAsync).toHaveBeenCalledTimes(1);
    expect(office.setSelectedDataAsync.mock.calls[0]?.[0]).toContain(created.joinUrl);
    expect(office.props.get('bsbox.code')).toBe('ABC-DEF');
    expect(office.props.get('bsbox.token')).toBe('tok');
  });

  it('shows the stored link on reopen and syncs times with the edit token', async () => {
    installFakeOffice({ props: { 'bsbox.code': 'ABC-DEF', 'bsbox.token': 'tok' } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    renderPane();
    await screen.findByRole('link', { name: /\/m\/ABC-DEF$/ });
    await userEvent.click(screen.getByRole('button', { name: 'Sync times' }));
    await screen.findByText('Times are up to date.');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/series/ABC-DEF');
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>)['X-Edit-Token']).toBe('tok');
  });

  it('leaves the body untouched on API failure and offers a retry', async () => {
    const office = installFakeOffice();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(500, { code: 'internal_error', title: 'boom' })),
    );
    renderPane();
    await userEvent.click(await screen.findByRole('button', { name: 'Add BSBox' }));
    await screen.findByRole('alert');
    expect(office.setSelectedDataAsync).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Add BSBox' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('does not create two series on a double click', async () => {
    installFakeOffice();
    let release: (r: Response) => void = () => undefined;
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((r) => (release = r)));
    vi.stubGlobal('fetch', fetchMock);
    renderPane();
    const button = await screen.findByRole('button', { name: 'Add BSBox' });
    await userEvent.dblClick(button);
    release(json(201, created));
    await waitFor(() => screen.getByText('BSBox is part of this invite.'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
