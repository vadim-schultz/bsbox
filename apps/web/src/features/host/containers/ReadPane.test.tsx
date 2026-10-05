import { afterEach, describe, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProviders } from '../../../app/AppProviders';
import { ReadPane } from './ReadPane';
import { installFakeOffice } from './fakeOffice';

const renderPane = () =>
  render(
    <AppProviders>
      <ReadPane />
    </AppProviders>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ReadPane', () => {
  it('shows "no BSBox session" without stored properties', async () => {
    installFakeOffice();
    renderPane();
    await screen.findByText('No BSBox session is attached to this meeting.');
  });

  it('links to the series and lists its history', async () => {
    installFakeOffice({ props: { 'bsbox.code': 'ABC-DEF' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [], nextCursor: null }), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    renderPane();
    await screen.findByRole('link', { name: 'Open meeting page' });
    await screen.findByText('No past meetings yet.');
  });
});
