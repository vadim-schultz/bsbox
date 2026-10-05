/** English catalogue. It defines the keys; `strings.de.ts` must satisfy the same type. */
export const en = {
  'app.name': 'BSBox',
  'landing.pitch': 'See how engaged your meeting really is, live and anonymous.',
  'landing.cta': 'Add to Outlook or Teams',
  'session.loading': 'Loading meeting…',
  'session.live': 'The meeting is live.',
  'session.ended': 'The meeting has ended.',
  'lobby.untitled': 'Meeting',
  'lobby.startsIn': 'Starts in',
  'lobby.drift':
    'Your device clock is off by more than 5 seconds. The countdown follows the server.',
  'lobby.present': '{count} here',
  'error.retry': 'Try again',
  'error.series_not_found.title': 'Meeting not found',
  'error.series_not_found.body':
    'This link does not match any meeting. Check the link and try again.',
  'error.session_expired.title': 'This meeting has expired',
  'error.session_expired.body': 'Results are kept for 30 days. This link is no longer available.',
  'error.network.title': 'Connection problem',
  'error.network.body': 'We could not reach BSBox. Check your connection and try again.',
  'error.internal.title': 'Something went wrong',
  'error.internal.body': 'Please try again in a moment.',
  'notFound.title': 'Page not found',
  'notFound.body': 'The page you are looking for does not exist.',
  'notFound.home': 'Back to start',
  'locale.label': 'Language',
  'locale.en': 'English',
  'locale.de': 'Deutsch',
  'error.not_found': 'We could not find that.',
  'error.internal_error': 'Something went wrong. Please try again.',
};

export type StringKey = keyof typeof en;
export type Catalogue = typeof en;
