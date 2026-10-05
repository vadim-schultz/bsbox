import { expect } from '@playwright/test';
import { expectEqual } from '../attempt';
import type { Check } from '../types';
import { winOf, type Win } from './open';
import { browserCheck } from './step';

const lastPresent = async (win: Win): Promise<number> => {
  const cells = win.page.locator('table tbody tr:last-child td');
  return Number(await cells.nth(0).textContent());
};

async function expectVoteVisible(win: Win): Promise<void> {
  await expect(win.page.getByRole('button', { name: win.vote })).toBeVisible({ timeout: 20_000 });
}

/** Lobby checks that need the skewed window while the countdown is still running. */
export async function lobbyChecks(wins: readonly Win[]): Promise<Check[]> {
  const skewed = winOf(wins, 'skewed-clock');
  if (!skewed) return [];
  return [
    await browserCheck('skewed-clock window warns about clock drift', async () => {
      await expect(
        skewed.page.getByRole('status').filter({ hasText: 'clock is off' }),
      ).toBeVisible();
    }),
  ];
}

/** Early in the live phase: cards are shown and the chart agrees with the expected headcount. */
export async function liveChecks(wins: readonly Win[], expectedPresent: number): Promise<Check[]> {
  const en = winOf(wins, 'en');
  if (!en) return [];
  return [
    await browserCheck('en window shows vote cards after the meeting starts', () =>
      expectVoteVisible(en),
    ),
    await browserCheck('en window chart headcount matches ground truth', async () => {
      await expect.poll(() => lastPresent(en), { timeout: 20_000 }).toBe(expectedPresent);
      expectEqual('present', expectedPresent, await lastPresent(en));
    }),
  ];
}
