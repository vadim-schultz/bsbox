import { describe, expect, it } from 'vitest';
import { teamsExternalKey, toTeamsRequest } from './teamsSeries';

const info = {
  context: { meetingId: 'm1', chatId: 'c1' },
  meeting: {
    joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc',
    threadId: '19:thread',
    title: 'Weekly',
    start: new Date('2026-03-02T10:00:00Z'),
    end: new Date('2026-03-02T10:45:00Z'),
  },
};

describe('teamsExternalKey', () => {
  it('is stable for the same meeting and differs between meetings', () => {
    const a = teamsExternalKey(info);
    expect(a).toMatch(/^teams:[0-9a-f]+$/);
    expect(teamsExternalKey({ ...info })).toBe(a);
    const other = { ...info, meeting: { ...info.meeting, joinUrl: 'https://x/y' } };
    expect(teamsExternalKey(other)).not.toBe(a);
  });

  it('is undefined when nothing identifies the meeting', () => {
    expect(teamsExternalKey({ context: {}, meeting: null })).toBeUndefined();
  });
});

describe('toTeamsRequest', () => {
  it('maps meeting details to a teams series request', () => {
    expect(toTeamsRequest(info, new Date('2026-03-02T09:00:00Z'))).toMatchObject({
      source: 'teams',
      title: 'Weekly',
      start: 1_772_445_600,
      durationMin: 45,
      externalKey: teamsExternalKey(info),
    });
  });

  it('defaults to a 60 minute meeting starting now without details', () => {
    const bare = { context: { meetingId: 'm1' }, meeting: null };
    const req = toTeamsRequest(bare, new Date('2026-03-02T09:00:00Z'));
    expect(req).toMatchObject({ start: 1_772_442_000, durationMin: 60 });
  });
});
