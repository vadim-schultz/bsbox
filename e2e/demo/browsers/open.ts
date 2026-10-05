import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { Check } from '../types';
import { browserCheck } from './step';

export type WindowName = 'en' | 'de' | 'reduced-motion' | 'skewed-clock';

export interface Win {
  name: WindowName;
  ctx: BrowserContext;
  page: Page;
  /** Name of the vote button in this window's language. */
  vote: string;
}

const SKEW_MS = 30_000;

const OPTIONS: Record<WindowName, { locale: string; reducedMotion?: 'reduce' }> = {
  en: { locale: 'en-US' },
  de: { locale: 'de-DE' },
  'reduced-motion': { locale: 'en-US', reducedMotion: 'reduce' },
  'skewed-clock': { locale: 'en-US' },
};

const VOTE_LABEL = { de: 'Das ist interessant' } as const;

async function open(browser: Browser, name: WindowName, url: string): Promise<Win> {
  const ctx = await browser.newContext({
    ...OPTIONS[name],
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctx.newPage();
  if (name === 'skewed-clock') await page.clock.install({ time: Date.now() + SKEW_MS });
  await page.goto(url);
  await expect(page.getByTestId('countdown')).toBeVisible({ timeout: 20_000 });
  const vote = name === 'de' ? VOTE_LABEL.de : 'This is interesting';
  return { name, ctx, page, vote };
}

/** Opens one window per scenario; windows that fail to open are reported and skipped. */
export async function openWindows(
  browser: Browser,
  webUrl: string,
  code: string,
): Promise<{ wins: Win[]; checks: Check[] }> {
  const wins: Win[] = [];
  const checks: Check[] = [];
  for (const name of Object.keys(OPTIONS) as WindowName[]) {
    checks.push(
      await browserCheck(`${name} window shows the lobby countdown`, async () => {
        wins.push(await open(browser, name, `${webUrl}/m/${code}`));
      }),
    );
  }
  return { wins, checks };
}

export const winOf = (wins: readonly Win[], name: WindowName): Win | undefined =>
  wins.find((w) => w.name === name);
