import { expect, test } from '@playwright/test';
import { createEndingMeeting, lastRow, readOutcome } from './support';

test('two participants vote, see the same chart, the same final score, and a reload keeps it', async ({
  browser,
  request,
}) => {
  const { code } = await createEndingMeeting(request, 50);
  const [ctxA, ctxB] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = [await ctxA.newPage(), await ctxB.newPage()];

  await Promise.all([a.goto(`/m/${code}`), b.goto(`/m/${code}`)]);
  const vote = (page: typeof a) => page.getByRole('button', { name: 'This is interesting' });
  await expect(vote(a)).toBeVisible();
  await expect(vote(b)).toBeVisible();

  await vote(a).click();
  await vote(b).click();
  await expect(vote(a)).toHaveAttribute('aria-pressed', 'true');

  // Live: both charts (via their accessible table) converge on 2 present, 2 engaged.
  for (const page of [a, b]) {
    await expect.poll(() => lastRow(page), { timeout: 30_000 }).toEqual({ present: 2, engaged: 2 });
  }

  // End: both get the pushed result with an identical score and level.
  await expect(a.getByTestId('score-ring')).toBeVisible({ timeout: 90_000 });
  await expect(b.getByTestId('score-ring')).toBeVisible({ timeout: 30_000 });
  const [outA, outB] = [await readOutcome(a), await readOutcome(b)];
  expect(outA.score).not.toBe('');
  expect(outA).toEqual(outB);

  // Reload: the stored result is served again.
  await a.reload();
  expect(await readOutcome(a)).toEqual(outA);

  await Promise.all([ctxA.close(), ctxB.close()]);
});
