import { expect, type Browser, type Page } from '@playwright/test';
import type { SessionResult } from '@bsbox/shared';
import { expectEqual } from '../attempt';
import type { Check } from '../types';
import { ringPercent } from './result';
import { browserCheck } from './step';

async function onFreshPage<T>(browser: Browser, fn: (page: Page) => Promise<T>): Promise<T> {
  const ctx = await browser.newContext({ locale: 'en-US' });
  try {
    return await fn(await ctx.newPage());
  } finally {
    await ctx.close();
  }
}

const expectHeading = (path: string, web: string, heading: string, browser: Browser) =>
  onFreshPage(browser, async (page) => {
    await page.goto(`${web}${path}`);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 15_000 });
  });

const expectText = (path: string, web: string, text: string, browser: Browser) =>
  onFreshPage(browser, async (page) => {
    await page.goto(`${web}${path}`);
    await expect(page.getByText(text)).toBeVisible({ timeout: 15_000 });
  });

/** Outside Outlook the compose pane renders, but adding fails with its error message. */
const composeOutside = (browser: Browser, web: string) =>
  onFreshPage(browser, async (page) => {
    await page.goto(`${web}/host/compose`);
    await page.getByRole('button', { name: 'Add BSBox' }).click();
    await expect(page.getByRole('alert')).toContainText('could not be added', { timeout: 15_000 });
  });

/** A fresh visitor after the end sees the stored result (served over REST, then the socket). */
async function lateJoin(
  browser: Browser,
  web: string,
  code: string,
  r: SessionResult,
): Promise<void> {
  await onFreshPage(browser, async (page) => {
    await page.goto(`${web}/m/${code}`);
    expectEqual('ring percent', Math.round(r.score * 100), await ringPercent(page));
  });
}

/** Windows that open after the meeting: late join, error pages and the host panes. */
export async function pageChecks(
  browser: Browser,
  web: string,
  codes: { ended: string; expired: string },
  result: SessionResult,
): Promise<Check[]> {
  return [
    await browserCheck('late joiner sees the stored result', () =>
      lateJoin(browser, web, codes.ended, result),
    ),
    await browserCheck('expired meeting shows the 410 page', () =>
      expectHeading(`/m/${codes.expired}`, web, 'This meeting has expired', browser),
    ),
    await browserCheck('unknown code shows the 404 page', () =>
      expectHeading('/m/NOSUCHCODE1', web, 'Meeting not found', browser),
    ),
    await browserCheck('/host/compose cannot add BSBox outside Outlook', () =>
      composeOutside(browser, web),
    ),
    await browserCheck('/host/read is unavailable outside Outlook', () =>
      expectText('/host/read', web, 'This page only works inside Outlook.', browser),
    ),
    await browserCheck('/host/teams asks to open inside Teams', () =>
      expectHeading('/host/teams', web, 'Open BSBox inside Teams', browser),
    ),
  ];
}
