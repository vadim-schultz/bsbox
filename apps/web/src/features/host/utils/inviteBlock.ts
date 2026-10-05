import type { Locale } from '../../../i18n';

const COPY: Record<Locale, { heading: string; line: string }> = {
  en: {
    heading: 'How engaged is this meeting?',
    line: 'Share your engagement anonymously with BSBox:',
  },
  de: {
    heading: 'Wie engagiert ist dieses Meeting?',
    line: 'Teilen Sie Ihr Engagement anonym mit BSBox:',
  },
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Styled HTML block followed by a plain-text fallback line, in the organizer's language. */
export function inviteBlockHtml(joinUrl: string, locale: Locale): string {
  const { heading, line } = COPY[locale];
  const url = escapeHtml(joinUrl);
  return (
    `<div style="border-left:4px solid #0f6cbd;padding:8px 12px;margin:12px 0;font-family:Segoe UI,sans-serif">` +
    `<strong>${escapeHtml(heading)}</strong><br>${escapeHtml(line)} ` +
    `<a href="${url}">${url}</a></div>` +
    `<p>${escapeHtml(line)} ${url}</p>`
  );
}
