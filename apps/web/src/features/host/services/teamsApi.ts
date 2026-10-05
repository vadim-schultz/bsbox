import { app, meeting, pages } from '@microsoft/teams-js';
import type { TeamsHostInfo, TeamsMeeting } from '../types';

/** The only module that touches teams-js. */
const INIT_TIMEOUT_MS = 2000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('teams-js timed out')), ms);
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

async function readMeeting(): Promise<TeamsMeeting | null> {
  try {
    const { details, conversation } = await meeting.getMeetingDetailsVerbose();
    const scheduled = 'scheduledEndTime' in details ? details : undefined;
    return {
      joinUrl: details.joinUrl,
      title: scheduled?.title,
      threadId: conversation?.id,
      start: details.scheduledStartTime ? new Date(details.scheduledStartTime) : undefined,
      end: scheduled?.scheduledEndTime ? new Date(scheduled.scheduledEndTime) : undefined,
    };
  } catch {
    return null;
  }
}

/** Resolves the Teams context, or null when the page is not hosted by Teams. */
export async function loadTeamsHost(): Promise<TeamsHostInfo | null> {
  try {
    await withTimeout(app.initialize(), INIT_TIMEOUT_MS);
    const ctx = await app.getContext();
    return {
      context: {
        theme: ctx.app.theme,
        locale: ctx.app.locale,
        meetingId: ctx.meeting?.id,
        chatId: ctx.chat?.id,
      },
      meeting: await readMeeting(),
    };
  } catch {
    return null;
  }
}

export function onTeamsThemeChange(handler: (theme: string) => void): void {
  app.registerOnThemeChangeHandler(handler);
}

/** Configurable-tab setup: points the meeting side panel at the content URL and saves. */
export async function configureTeamsTab(contentUrl: string): Promise<boolean> {
  try {
    await withTimeout(app.initialize(), INIT_TIMEOUT_MS);
    pages.config.registerOnSaveHandler((event) => {
      pages.config
        .setConfig({ contentUrl, entityId: 'bsbox-panel', suggestedDisplayName: 'BSBox' })
        .then(() => event.notifySuccess())
        .catch(() => event.notifyFailure('config failed'));
    });
    pages.config.setValidityState(true);
    return true;
  } catch {
    return false;
  }
}
