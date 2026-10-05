import { expect, type Page } from '@playwright/test';
import type { SessionResult } from '@bsbox/shared';
import { expectEqual } from '../attempt';
import type { Check } from '../types';
import { winOf, type Win } from './open';
import { browserCheck } from './step';

const RESULT_WAIT_MS = 60_000;

const percent = (text: string | null): number => Number((text ?? '').replace(/\D/g, ''));

/** Shown ring value in whole percent, read from the visually hidden twin. */
export async function ringPercent(page: Page): Promise<number> {
  const ring = page.getByTestId('score-ring');
  await expect(ring).toBeVisible({ timeout: RESULT_WAIT_MS });
  return percent(await ring.locator('.bsbox-sr-only').textContent());
}

const sameAsServer = (win: Win, result: SessionResult) => async () => {
  const shown = await ringPercent(win.page);
  expectEqual('ring percent', Math.round(result.score * 100), shown);
  await expect(win.page.getByTestId('level-badge')).toBeVisible();
};

async function jumpsToValue(win: Win): Promise<void> {
  const ring = win.page.getByTestId('score-ring');
  await expect(ring).toBeVisible({ timeout: RESULT_WAIT_MS });
  const [animated, final] = await Promise.all([
    ring.locator('strong').textContent(),
    ring.locator('.bsbox-sr-only').textContent(),
  ]);
  expectEqual('first painted value', percent(final), percent(animated));
}

async function copySummary(win: Win): Promise<void> {
  await win.page.getByRole('button', { name: 'Copy summary' }).click();
  await expect(win.page.getByText('Copied to clipboard.')).toBeVisible();
  const text = await win.page.evaluate(() => navigator.clipboard.readText());
  expectEqual('summary mentions engagement', true, /engagement/i.test(text));
}

async function copyLink(win: Win): Promise<void> {
  await win.page.getByRole('button', { name: 'Share link' }).click();
  const text = await win.page.evaluate(() => navigator.clipboard.readText());
  expectEqual('link points at the meeting', true, text.includes('/m/'));
}

/** After the end: every window shows the server's score; en exercises moments and sharing. */
export async function resultChecks(wins: readonly Win[], result: SessionResult): Promise<Check[]> {
  const out = await Promise.all(
    wins.map((w) =>
      browserCheck(`${w.name} window shows the server score`, sameAsServer(w, result)),
    ),
  );
  const [en, reduced] = [winOf(wins, 'en'), winOf(wins, 'reduced-motion')];
  if (en)
    out.push(
      await browserCheck('en window shows peak and low moments', async () => {
        await expect(en.page.getByText(/Most engaged: minute/)).toBeVisible();
        await expect(en.page.getByText(/Least engaged: minute/)).toBeVisible();
      }),
    );
  if (en) out.push(await browserCheck('en window copy summary works', () => copySummary(en)));
  if (en) out.push(await browserCheck('en window copy link works', () => copyLink(en)));
  if (reduced)
    out.push(
      await browserCheck('reduced-motion window ring jumps to the value', () =>
        jumpsToValue(reduced),
      ),
    );
  return out;
}
