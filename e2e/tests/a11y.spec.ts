import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  createEndingMeeting,
  createLiveMeeting,
  createLobbyMeeting,
  type Meeting,
} from './support';

type Locale = 'en' | 'de';
type Mode = 'light' | 'dark' | 'contrast';

const LOCALES: Locale[] = ['en', 'de'];
const MODES: Mode[] = ['light', 'dark', 'contrast'];

const contextFor = (browser: Browser, locale: Locale, mode: Mode) =>
  browser.newContext({
    locale,
    colorScheme: mode === 'dark' ? 'dark' : 'light',
    forcedColors: mode === 'contrast' ? 'active' : 'none',
  });

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(' | ')})`),
  ).toEqual([]);
}

/** Minimal Office.js stand-in so the Outlook task panes render their real UI. */
const fakeOffice = (code: string | null) => `
  const ok = (value) => ({ status: 'succeeded', value });
  const getter = (value) => ({ getAsync: (cb) => cb(ok(value)) });
  const props = ${JSON.stringify(code ? { 'bsbox.code': code } : {})};
  window.Office = { context: {
    displayLanguage: navigator.language,
    requirements: { isSetSupported: () => true },
    mailbox: { item: {
      subject: getter('Weekly sync'),
      start: getter(new Date(Date.now() + 86400000)),
      end: getter(new Date(Date.now() + 90000000)),
      recurrence: getter(null),
      body: {
        getAsync: (_t, cb) => cb(ok('Join https://teams.microsoft.com/l/meetup-join/abc123')),
        setSelectedDataAsync: (_d, _o, cb) => cb(ok(undefined)),
      },
      loadCustomPropertiesAsync: (cb) => cb(ok({
        get: (k) => props[k], set: () => undefined, saveAsync: (done) => done(ok(undefined)),
      })),
    } },
  } };
`;

let lobby: Meeting;
let live: Meeting;
let ended: Meeting;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ playwright, browser }) => {
  const request = await playwright.request.newContext();
  [lobby, live] = [await createLobbyMeeting(request), await createLiveMeeting(request)];
  ended = await createEndingMeeting(request, 25);
  // One participant votes so the ended session has a real (non-empty) result.
  const page = await (await browser.newContext()).newPage();
  await page.goto(`/m/${ended.code}`);
  await page.getByRole('button', { name: 'This is interesting' }).click();
  await expect(page.getByTestId('score-ring')).toBeVisible({ timeout: 90_000 });
  await page.context().close();
  await request.dispose();
});

for (const locale of LOCALES) {
  for (const mode of MODES) {
    test.describe(`${locale} / ${mode}`, () => {
      test('lobby', async ({ browser }) => {
        const page = await (await contextFor(browser, locale, mode)).newPage();
        await page.goto(`/m/${lobby.code}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoViolations(page);
      });

      test('live', async ({ browser }) => {
        const page = await (await contextFor(browser, locale, mode)).newPage();
        await page.goto(`/m/${live.code}`);
        await expect(page.getByRole('group')).toBeVisible();
        await expect(page.getByRole('button', { pressed: false }).first()).toBeVisible();
        await expectNoViolations(page);
      });

      test('result', async ({ browser }) => {
        const page = await (await contextFor(browser, locale, mode)).newPage();
        await page.goto(`/m/${ended.code}`);
        await expect(page.getByTestId('score-ring')).toBeVisible();
        await expectNoViolations(page);
      });

      test('outlook compose and read task panes, teams panel', async ({ browser }) => {
        const ctx = await contextFor(browser, locale, mode);
        for (const [path, code] of [
          ['/host/compose', null],
          ['/host/read', ended.code],
        ] as const) {
          const page = await ctx.newPage();
          await page.addInitScript(fakeOffice(code));
          await page.goto(path);
          await expect(page.getByRole('heading').first()).toBeVisible();
          await expectNoViolations(page);
        }
        const teams = await ctx.newPage();
        await teams.goto('/host/teams');
        await expect(teams.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
        await expectNoViolations(teams);
      });
    });
  }
}
