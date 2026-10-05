import { expect } from '@playwright/test';
import type { Check } from '../types';
import { winOf, type Win } from './open';
import { browserCheck } from './step';

const cardsVisible = (win: Win) =>
  expect(win.page.getByRole('button', { name: win.vote })).toBeVisible({ timeout: 25_000 });

async function reload(win: Win): Promise<void> {
  await win.page.reload();
  await cardsVisible(win);
}

async function offlineBlip(win: Win): Promise<void> {
  await win.ctx.setOffline(true);
  await win.page.waitForTimeout(3000);
  await win.ctx.setOffline(false);
  await cardsVisible(win);
}

async function switchLocale(win: Win): Promise<void> {
  await win.page.getByRole('combobox').selectOption('en');
  const en = win.page.getByRole('button', { name: 'This is interesting' });
  await expect(en).toBeVisible();
}

/** Mid-session disturbances: reload with a stored token, a network blip and a locale switch. */
export async function midChecks(wins: readonly Win[]): Promise<Check[]> {
  const [en, de] = [winOf(wins, 'en'), winOf(wins, 'de')];
  const out: Check[] = [];
  if (en)
    out.push(await browserCheck('en window survives a reload (token reused)', () => reload(en)));
  if (de)
    out.push(await browserCheck('de window recovers from going offline', () => offlineBlip(de)));
  if (de)
    out.push(
      await browserCheck('de window locale switcher flips to English', () => switchLocale(de)),
    );
  return out;
}
