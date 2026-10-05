import type { Catalogue } from './strings.en';

/** German catalogue; a missing key fails typecheck. */
export const de: Catalogue = {
  'app.name': 'BSBox',
  'landing.pitch': 'Sehen Sie, wie engagiert Ihr Meeting wirklich ist, live und anonym.',
  'landing.cta': 'Zu Outlook oder Teams hinzufügen',
  'session.loading': 'Meeting wird geladen…',
  'session.live': 'Das Meeting läuft.',
  'session.ended': 'Das Meeting ist beendet.',
  'lobby.untitled': 'Meeting',
  'lobby.startsIn': 'Beginnt in',
  'lobby.drift':
    'Die Uhr Ihres Geräts weicht um mehr als 5 Sekunden ab. Der Countdown folgt dem Server.',
  'lobby.present': '{count} anwesend',
  'error.retry': 'Erneut versuchen',
  'error.series_not_found.title': 'Meeting nicht gefunden',
  'error.series_not_found.body':
    'Dieser Link gehört zu keinem Meeting. Prüfen Sie den Link und versuchen Sie es erneut.',
  'error.session_expired.title': 'Dieses Meeting ist abgelaufen',
  'error.session_expired.body':
    'Ergebnisse werden 30 Tage aufbewahrt. Dieser Link ist nicht mehr verfügbar.',
  'error.network.title': 'Verbindungsproblem',
  'error.network.body':
    'BSBox ist nicht erreichbar. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
  'error.internal.title': 'Etwas ist schiefgelaufen',
  'error.internal.body': 'Bitte versuchen Sie es gleich noch einmal.',
  'notFound.title': 'Seite nicht gefunden',
  'notFound.body': 'Die gesuchte Seite existiert nicht.',
  'notFound.home': 'Zurück zum Start',
  'locale.label': 'Sprache',
  'locale.en': 'English',
  'locale.de': 'Deutsch',
  'error.not_found': 'Das konnten wir nicht finden.',
  'error.internal_error': 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
};
