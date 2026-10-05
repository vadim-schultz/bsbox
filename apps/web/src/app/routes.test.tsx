import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './routes';

const at = (path: string) =>
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );

describe('routes', () => {
  it('renders landing at /', () => {
    at('/');
    expect(screen.getByRole('heading', { name: 'BSBox' })).toBeTruthy();
  });

  it('renders the session placeholder with the code', () => {
    at('/m/ABC123');
    expect(screen.getByText(/ABC123/)).toBeTruthy();
  });

  it('renders not found for unknown paths', () => {
    at('/nope/what');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
  });
});
