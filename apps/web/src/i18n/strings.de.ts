import type { Catalogue } from './strings.en';

/** German catalogue; a missing key fails typecheck. */
export const de: Catalogue = {
  'app.name': 'BSBox',
  'landing.pitch': 'Sehen Sie, wie engagiert Ihr Meeting wirklich ist, live und anonym.',
  'landing.cta': 'Zu Outlook oder Teams hinzufügen',
  'session.placeholder': 'Sitzung {code}',
  'notFound.title': 'Seite nicht gefunden',
  'notFound.body': 'Die gesuchte Seite existiert nicht.',
  'notFound.home': 'Zurück zum Start',
  'locale.label': 'Sprache',
  'locale.en': 'English',
  'locale.de': 'Deutsch',
  'error.not_found': 'Das konnten wir nicht finden.',
  'error.internal_error': 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
};
