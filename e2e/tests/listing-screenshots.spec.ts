import { expect, test } from '@playwright/test';
import { createEndingMeeting, createLiveMeeting, createLobbyMeeting } from './support';

// Regenerates the AppSource listing screenshots: LISTING_SHOTS=1 pnpm --filter @bsbox/e2e exec playwright test listing-screenshots
test.skip(!process.env.LISTING_SHOTS, 'set LISTING_SHOTS=1 to regenerate listing screenshots');

const OUT = new URL('../../packages/addin/listing/', import.meta.url).pathname;

for (const locale of ['en', 'de'] as const) {
  test(`listing screenshots (${locale})`, async ({ browser, request }) => {
    const ctx = await browser.newContext({ locale, viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    const shot = (name: string) =>
      page.screenshot({ path: `${OUT}${locale}/screenshots/${name}.png` });

    await page.goto(`/m/${(await createLobbyMeeting(request)).code}`);
    await page.waitForLoadState('networkidle');
    await shot('lobby');

    await page.goto(`/m/${(await createLiveMeeting(request)).code}`);
    await page.getByRole('button').first().click();
    await page.waitForTimeout(2000);
    await shot('live');

    await page.goto(`/m/${(await createEndingMeeting(request, 20)).code}`);
    await expect(page.getByTestId('score-ring')).toBeVisible({ timeout: 90_000 });
    await shot('result');
    await ctx.close();
  });
}
