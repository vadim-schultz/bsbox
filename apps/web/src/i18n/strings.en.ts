/** English catalogue. It defines the keys; `strings.de.ts` must satisfy the same type. */
export const en = {
  'app.name': 'BSBox',
  'landing.pitch': 'See how engaged your meeting really is, live and anonymous.',
  'landing.cta': 'Add to Outlook or Teams',
  'session.placeholder': 'Session {code}',
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
