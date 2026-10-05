import { describe, expect, it } from 'vitest';
import { inviteBlockHtml } from './inviteBlock';
import { toRrule } from './rrule';
import { findTeamsJoinUrl, toCreateRequest } from './snapshot';

describe('toRrule', () => {
  it('maps weekly recurrence with days', () => {
    expect(
      toRrule({
        recurrenceType: 'weekly',
        recurrenceProperties: { interval: 2, days: ['Mon', 'thu'] },
      }),
    ).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH');
  });
  it('returns undefined for none or unsupported types', () => {
    expect(toRrule(null)).toBeUndefined();
    expect(toRrule({ recurrenceType: 'yearly' })).toBeUndefined();
  });
});

describe('inviteBlockHtml', () => {
  it('renders en and de copy and escapes the url', () => {
    expect(inviteBlockHtml('https://x/m/A', 'en')).toContain('How engaged is this meeting?');
    expect(inviteBlockHtml('https://x/m/A?a=1&b="2"', 'de')).toContain('Wie engagiert');
    expect(inviteBlockHtml('https://x/m/A?a=1&b="2"', 'de')).toContain('a=1&amp;b=&quot;2&quot;');
  });
});

describe('toCreateRequest', () => {
  const base = {
    subject: '',
    start: new Date('2030-01-07T09:00:00Z'),
    end: new Date('2030-01-07T09:01:00Z'),
    recurrence: null,
    bodyText: 'no link',
  };
  it('clamps duration, omits empty title and external key', () => {
    const req = toCreateRequest(base);
    expect(req.durationMin).toBe(5);
    expect(req).not.toHaveProperty('title');
    expect(req).not.toHaveProperty('externalKey');
  });
  it('finds no join url in plain text', () => {
    expect(findTeamsJoinUrl('hello')).toBeUndefined();
  });
});
